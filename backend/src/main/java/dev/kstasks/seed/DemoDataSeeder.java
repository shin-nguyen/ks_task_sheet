package dev.kstasks.seed;

import dev.kstasks.auth.User;
import dev.kstasks.auth.UserRepository;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicMember;
import dev.kstasks.epic.EpicMemberRepository;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.status.TaskStatus;
import dev.kstasks.status.TaskStatusRepository;
import dev.kstasks.task.Task;
import dev.kstasks.task.TaskLink;
import dev.kstasks.task.TaskLinkRepository;
import dev.kstasks.task.TaskRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Profile("seed")
public class DemoDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EpicRepository epicRepository;
    private final TaskRepository taskRepository;
    private final TaskLinkRepository taskLinkRepository;
    private final TaskStatusRepository statusRepository;
    private final EpicMemberRepository epicMemberRepository;

    public DemoDataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           EpicRepository epicRepository, TaskRepository taskRepository,
                           TaskLinkRepository taskLinkRepository, TaskStatusRepository statusRepository,
                           EpicMemberRepository epicMemberRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.epicRepository = epicRepository;
        this.taskRepository = taskRepository;
        this.taskLinkRepository = taskLinkRepository;
        this.statusRepository = statusRepository;
        this.epicMemberRepository = epicMemberRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return; // already seeded
        }

        User alice = createUser("alice@team.dev", "Alice Nguyen", User.Role.ADMIN);
        User ben = createUser("ben@team.dev", "Ben Carter", User.Role.MEMBER);
        User cara = createUser("cara@team.dev", "Cara Diaz", User.Role.MEMBER);
        User dan = createUser("dan@team.dev", "Dan Whitfield", User.Role.MEMBER);

        Epic epic = new Epic();
        epic.setTicketId("PAY-88");
        epic.setName("Payment Refund Flow");
        epic.setCreatedBy(alice);
        epic = epicRepository.save(epic);

        for (User u : List.of(alice, ben, cara, dan)) {
            EpicMember member = new EpicMember();
            member.setEpic(epic);
            member.setUser(u);
            epicMemberRepository.save(member);
        }

        Map<String, TaskStatus> statuses = new HashMap<>();
        statusRepository.findAllByOrderBySortOrderAsc().forEach(s -> statuses.put(s.getName(), s));
        TaskStatus todo = statuses.get("Todo");
        TaskStatus inProgress = statuses.get("In progress");
        TaskStatus done = statuses.get("Done");

        Epic finalEpic = epic;
        Task be101 = task(finalEpic, "BE-101", "Refund API endpoint", Task.Type.BE, alice, null, "4", "1", inProgress, "Waiting for sandbox access", 0);
        Task ui55 = task(finalEpic, "UI-55", "Refund request modal", Task.Type.UI, null, cara, "3", "1", inProgress, "", 1);
        link(be101, ui55);

        Task be102 = task(finalEpic, "BE-102", "Refund status webhook", Task.Type.BE, alice, null, "2", "0.5", todo, "", 2);
        Task ui56 = task(finalEpic, "UI-56", "Refund status badge + toast", Task.Type.UI, null, cara, "1.5", "0.5", todo, "Waiting for PM copy", 3);
        link(be102, ui56);

        Task be103 = task(finalEpic, "BE-103", "Refund history query", Task.Type.BE, ben, null, "2", "0.5", done, "", 4);
        Task ui57 = task(finalEpic, "UI-57", "Refund history table", Task.Type.UI, null, dan, "2.5", "1", todo, "", 5);
        link(be103, ui57);

        task(finalEpic, "BE-104", "Idempotency + retry handling", Task.Type.BE, ben, null, "3", "1", todo, "Needs idempotency key on refund_txn", 6);
        task(finalEpic, "BE-105", "Refund permission check", Task.Type.BE, ben, null, "1.5", "0.5", done, "", 7);
        task(finalEpic, "UI-58", "Refund reason dropdown", Task.Type.UI, null, null, "0", "0", todo, "", 8);
        task(finalEpic, "BE-106", "Refund rate limiting", Task.Type.BE, null, null, "1", "0.5", todo, "", 9);
    }

    private User createUser(String email, String name, User.Role role) {
        User u = new User();
        u.setEmail(email);
        u.setName(name);
        u.setPassword(passwordEncoder.encode("password123"));
        u.setRole(role);
        return userRepository.save(u);
    }

    private Task task(Epic epic, String ticketId, String title, Task.Type type, User be, User ui,
                       String devEffort, String testEffort, TaskStatus status, String note, int sortOrder) {
        Task t = new Task();
        t.setEpic(epic);
        t.setTicketId(ticketId);
        t.setTitle(title);
        t.setType(type);
        t.setBeAssignee(be);
        t.setUiAssignee(ui);
        BigDecimal dev = new BigDecimal(devEffort);
        BigDecimal test = new BigDecimal(testEffort);
        t.setDevEffort(dev);
        t.setTestEffort(test);
        t.setTotalEffort(dev.add(test));
        t.setStatus(status);
        t.setNote(note);
        t.setSortOrder(sortOrder);
        return taskRepository.save(t);
    }

    private void link(Task be, Task ui) {
        TaskLink link = new TaskLink();
        link.setBeTask(be);
        link.setUiTask(ui);
        taskLinkRepository.save(link);
    }
}
