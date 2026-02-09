import { Button } from "@/components/ui/button";

interface ToolbarProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  onClose: () => void;
  dirty: boolean;
}

export function Toolbar({ onSave, onUndo, onRedo, onPublish, onClose, dirty }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onClose}>
        Back
      </Button>
      <Button variant="ghost" size="sm" onClick={onUndo}>
        Undo
      </Button>
      <Button variant="ghost" size="sm" onClick={onRedo}>
        Redo
      </Button>
      <Button variant="outline" size="sm" onClick={onPublish}>
        Publish
      </Button>
      <Button variant="primary" size="sm" onClick={onSave} className="ml-auto">
        Save Command {dirty ? "*" : ""}
      </Button>
    </div>
  );
}
