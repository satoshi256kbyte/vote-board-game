'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface VoteConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  currentCandidatePosition: string;
  newCandidatePosition: string;
}

export function VoteConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  currentCandidatePosition,
  newCandidatePosition,
}: VoteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        onEscapeKeyDown={onCancel}
        onPointerDownOutside={onCancel}
        onInteractOutside={onCancel}
      >
        <DialogHeader>
          <DialogTitle>投票を変更しますか?</DialogTitle>
          <DialogDescription>現在の投票を取り消して、新しい候補に投票します。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">現在の投票先:</p>
            <p className="text-lg font-bold text-primary">{currentCandidatePosition}</p>
          </div>

          <div className="flex items-center justify-center">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">新しい投票先:</p>
            <p className="text-lg font-bold text-primary">{newCandidatePosition}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="cancel-button">
            キャンセル
          </Button>
          <Button onClick={onConfirm} data-testid="confirm-button">
            投票を変更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
