import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function TextEditModal({
  open,
  title,
  initialValue,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(value);
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <textarea
        autoFocus
        className="h-40 w-full resize-none rounded-md border border-line p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />
    </Modal>
  );
}
