package dev.kstasks.notify;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class GitPollingService {

    private static final Logger log = LoggerFactory.getLogger(GitPollingService.class);
    private static final Duration GIT_TIMEOUT = Duration.ofSeconds(60);

    @Value("${app.storage.git-repos-dir}")
    private String gitReposDir;

    @Value("${app.notify.git-access-token}")
    private String gitAccessToken;

    private final EpicNotifyConfigRepository notifyConfigRepository;
    private final EpicNotifyStateRepository notifyStateRepository;
    private final NotifyDispatchService notifyDispatchService;

    private Path baseDir;

    public GitPollingService(EpicNotifyConfigRepository notifyConfigRepository, EpicNotifyStateRepository notifyStateRepository,
                              NotifyDispatchService notifyDispatchService) {
        this.notifyConfigRepository = notifyConfigRepository;
        this.notifyStateRepository = notifyStateRepository;
        this.notifyDispatchService = notifyDispatchService;
    }

    @PostConstruct
    void init() throws IOException {
        baseDir = Path.of(gitReposDir).toAbsolutePath().normalize();
        Files.createDirectories(baseDir);
        try {
            runGit(List.of("--version"), null);
        } catch (Exception e) {
            log.warn("git binary not available or not working ({}) - merge notifications will fail until this is fixed", e.getMessage());
        }
    }

    @Transactional
    public void checkAllDueEpics(Instant now) {
        for (EpicNotifyConfig config : notifyConfigRepository.findAllByMergeNotifyEnabledTrue()) {
            var epicId = config.getEpic().getId();
            EpicNotifyState state = notifyStateRepository.findById(epicId).orElse(null);
            Instant lastCheck = state != null ? state.getLastGitCheckAt() : null;
            long intervalMinutes = config.getGitPollIntervalMinutes();
            boolean due = lastCheck == null || Duration.between(lastCheck, now).toMinutes() >= intervalMinutes;
            if (due) {
                checkOneEpic(config, state, now);
            }
        }
    }

    private void checkOneEpic(EpicNotifyConfig config, EpicNotifyState state, Instant now) {
        var epicId = config.getEpic().getId();
        if (state == null) {
            state = new EpicNotifyState();
            state.setEpicId(epicId);
        }
        Path repoDir = baseDir.resolve(epicId.toString());
        try {
            List<String> authArgs = gitAccessToken != null && !gitAccessToken.isBlank()
                    ? List.of("-c", "http.extraHeader=Authorization: Bearer " + gitAccessToken)
                    : List.of();
            boolean firstClone = !Files.isDirectory(repoDir.resolve(".git"));
            if (firstClone) {
                List<String> cloneArgs = new ArrayList<>(authArgs);
                cloneArgs.addAll(List.of("clone", "--branch", config.getGitBranch(), "--single-branch",
                        config.getGitRepoUrl(), repoDir.toString()));
                runGit(cloneArgs, baseDir);
            } else {
                List<String> fetchArgs = new ArrayList<>(List.of("-C", repoDir.toString()));
                fetchArgs.addAll(authArgs);
                fetchArgs.addAll(List.of("fetch", "origin", config.getGitBranch()));
                runGit(fetchArgs, null);
            }

            String newSha = runGit(List.of("-C", repoDir.toString(), "rev-parse", "origin/" + config.getGitBranch()), null).stdout();
            state.setGitCloneStatus(EpicNotifyState.GitCloneStatus.OK);
            state.setGitLastError(null);

            String oldSha = state.getLastSeenCommitSha();
            if (oldSha == null) {
                state.setLastSeenCommitSha(newSha);
            } else if (!oldSha.equals(newSha)) {
                notifyDispatchService.sendToEpicRoom(config, buildCommitMessage(config, oldSha, newSha, repoDir));
                state.setLastSeenCommitSha(newSha);
            }
        } catch (Exception e) {
            state.setGitCloneStatus(EpicNotifyState.GitCloneStatus.ERROR);
            state.setGitLastError(redact(truncate(e.getMessage())));
            log.warn("Git poll failed for epic {}: {}", epicId, redact(e.getMessage()));
        } finally {
            state.setLastGitCheckAt(now);
            notifyStateRepository.save(state);
        }
    }

    private String buildCommitMessage(EpicNotifyConfig config, String oldSha, String newSha, Path repoDir) {
        String commitList;
        try {
            commitList = runGit(List.of("-C", repoDir.toString(), "log", "--pretty=format:- %an: %s", oldSha + ".." + newSha), null).stdout();
        } catch (Exception e) {
            commitList = null;
        }
        StringBuilder sb = new StringBuilder("*[Automated Message]* New commits on branch *")
                .append(config.getGitBranch())
                .append("*");
        if (commitList != null && !commitList.isBlank()) {
            sb.append(":\n").append(commitList);
        } else {
            sb.append(" - branch was updated.");
        }
        return sb.toString();
    }

    private record GitResult(String stdout, String stderr) {
    }

    private GitResult runGit(List<String> args, Path workingDir) {
        List<String> command = new ArrayList<>(args.size() + 1);
        command.add("git");
        command.addAll(args);
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            if (workingDir != null) {
                pb.directory(workingDir.toFile());
            }
            Process process = pb.start();
            StringBuilder stdout = new StringBuilder();
            StringBuilder stderr = new StringBuilder();
            Thread outReader = drainAsync(process.getInputStream(), stdout);
            Thread errReader = drainAsync(process.getErrorStream(), stderr);
            boolean finished = process.waitFor(GIT_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("git command timed out after " + GIT_TIMEOUT.toSeconds() + "s");
            }
            outReader.join();
            errReader.join();
            if (process.exitValue() != 0) {
                throw new RuntimeException("git exited with code " + process.exitValue() + ": " + redact(stderr.toString().trim()));
            }
            return new GitResult(stdout.toString().trim(), stderr.toString().trim());
        } catch (IOException e) {
            throw new RuntimeException(redact(e.getMessage()), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(redact(e.getMessage()), e);
        }
    }

    private Thread drainAsync(InputStream in, StringBuilder into) {
        Thread t = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                reader.lines().forEach(line -> into.append(line).append('\n'));
            } catch (IOException ignored) {
            }
        });
        t.start();
        return t;
    }

    private String redact(String text) {
        if (text == null || gitAccessToken == null || gitAccessToken.isBlank()) {
            return text;
        }
        return text.replace(gitAccessToken, "***");
    }

    private String truncate(String text) {
        if (text == null) {
            return null;
        }
        return text.length() > 2000 ? text.substring(0, 2000) : text;
    }
}
