"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DraftListModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>下書き一覧</DialogTitle>
        </DialogHeader>
        <div className="py-8 text-center text-sm text-gray-400">
          保存済みの下書きはありません
        </div>
      </DialogContent>
    </Dialog>
  );
}
