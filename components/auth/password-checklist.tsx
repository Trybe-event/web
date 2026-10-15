import { Check, Circle } from "lucide-react";
import { passwordRequirements } from "@/lib/password-policy";

export function PasswordChecklist({
  password,
  id,
}: {
  password: string;
  id: string;
}) {
  const completedRequirements = passwordRequirements.filter((requirement) =>
    requirement.test(password),
  ).length;
  return (
    <div id={id} className="space-y-2 text-xs text-muted">
      <p className="font-medium" role="status" aria-live="polite">
        {completedRequirements === passwordRequirements.length
          ? "Password requirements met"
          : `Password requirements: ${completedRequirements} of ${passwordRequirements.length} met`}
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {passwordRequirements.map((requirement) => {
          const satisfied = requirement.test(password);
          const Icon = satisfied ? Check : Circle;
          return (
            <li
              key={requirement.label}
              className={`flex items-center gap-2 ${satisfied ? "text-ink" : "text-muted"}`}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="sr-only">
                {satisfied ? "Met: " : "Needed: "}
              </span>
              {requirement.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
