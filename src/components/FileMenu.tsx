import { FilePlus2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { startNewProject } from "@/state/projectActions";

interface FileMenuProps {
  onNewProject: () => void;
}

export function FileMenu({ onNewProject }: FileMenuProps) {
  const [busy, setBusy] = useState(false);

  const newProject = async () => {
    setBusy(true);
    try {
      await startNewProject();
      onNewProject();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => void newProject()}>
          <FilePlus2 /> New
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
