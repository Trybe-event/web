"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  Skeleton,
  Dialog,
  Field,
  Input,
} from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

import { LINK_LABELS, VISIBILITY_LABELS } from "./labels";
import { AttendeeProfileMenu } from "@/components/attendee/profile-menu";
import { SignOut } from "@/components/auth/sign-out";
import { PortfolioLink } from "@/components/ui/portfolio-link";

export function ProfileHome() {
  const router = useRouter();
  const [profile, setProfile] = useState<Schemas["OwnProfile"] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"confirmation" | "review">(
    "confirmation",
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletionInProgress = useRef(false);
  const confirmationMatches = deleteConfirmation === "DELETE MY ACCOUNT";

  useEffect(() => {
    api.GET("/me/profile").then(({ data, error, response }) => {
      if (data) setProfile(data);
      else if (response.status === 404)
        router.replace("/attendee/profile/edit?onboarding=1");
      else setFailure(errorMessage(error));
    });
  }, [router]);

  async function handleDeleteConfirm() {
    if (
      deletionInProgress.current ||
      deleteStep !== "review" ||
      !confirmationMatches ||
      !deleteAcknowledged
    )
      return;
    deletionInProgress.current = true;
    setIsDeleting(true);
    setFailure(null);
    try {
      const { error, response } = await api.DELETE("/me", {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        setFailure(errorMessage(error));
        return;
      }
      setShowDeleteDialog(false);
      router.replace("/attendee/sign-in");
    } catch {
      setFailure("We couldn't confirm account deletion. Please try again.");
    } finally {
      deletionInProgress.current = false;
      setIsDeleting(false);
    }
  }

  return (
    <div className="attendee-profile-page">
      <header className="attendee-page-heading">
        <span className="attendee-kicker">
          A LITTLE INTRODUCTION GOES A LONG WAY
        </span>
        <h1>Your profile</h1>
        <p>Your story, your interests and how you choose to connect.</p>
      </header>
      {failure && <Alert>{failure}</Alert>}
      {!profile && !failure && <Skeleton className="h-48" />}
      {profile && (
        <>
          <div className="attendee-profile-grid">
            <Card className="attendee-profile-card flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar
                  name={profile.full_name}
                  src={profile.photo_url}
                  size={64}
                />
                <div>
                  <p className="text-xl font-bold">{profile.full_name}</p>
                  <p className="text-muted">
                    {profile.role}
                    {profile.organization ? ` · ${profile.organization}` : ""}
                  </p>
                </div>
              </div>
              <p>{profile.bio}</p>
              {profile.goals && (
                <p>
                  <span className="font-semibold">Looking for: </span>
                  {profile.goals}
                </p>
              )}
              <TagList label="Skills" items={profile.skills} />
              <TagList label="Interests" items={profile.interests} />
              {profile.links.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold">Links and contacts</h2>
                  <ul className="mt-2 flex flex-col gap-2">
                    {profile.links.map((l, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        {l.kind === "portfolio" ? (
                          <PortfolioLink value={l.value} />
                        ) : (
                          <span>
                            <span className="font-semibold">
                              {LINK_LABELS[l.kind]}:
                            </span>{" "}
                            {l.value}
                          </span>
                        )}
                        <Badge
                          tone={
                            l.visibility === "hidden" ? "neutral" : "accent"
                          }
                        >
                          {VISIBILITY_LABELS[l.visibility]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ButtonLink href="/attendee/profile/preview" variant="secondary">
                Preview how others see me
              </ButtonLink>
            </Card>
            <AttendeeProfileMenu />
          </div>
          <section id="account-actions" className="attendee-account-actions">
            <div>
              <h2>Account actions</h2>
              <p>
                Sign out of this device, or permanently delete your account.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SignOut />
              <Button
                variant="danger"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteStep("confirmation");
                  setDeleteConfirmation("");
                  setDeleteAcknowledged(false);
                  setShowDeleteDialog(true);
                }}
              >
                Delete account
              </Button>
            </div>
          </section>
          {showDeleteDialog && (
            <Dialog
              open={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              title={
                deleteStep === "confirmation"
                  ? "Confirm account deletion"
                  : "Final review"
              }
              description="This will permanently delete your account. This action cannot be undone. Your connections may already have copied or seen your data."
              actions={
                <>
                  <Button
                    variant="secondary"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </Button>
                  {deleteStep === "confirmation" ? (
                    <Button
                      disabled={!confirmationMatches}
                      onClick={() => setDeleteStep("review")}
                    >
                      Review deletion
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        disabled={isDeleting}
                        onClick={() => {
                          setDeleteAcknowledged(false);
                          setDeleteStep("confirmation");
                        }}
                      >
                        Go back
                      </Button>
                      <Button
                        variant="danger"
                        loading={isDeleting}
                        disabled={
                          !confirmationMatches ||
                          !deleteAcknowledged ||
                          isDeleting
                        }
                        onClick={handleDeleteConfirm}
                      >
                        Permanently delete my account
                      </Button>
                    </>
                  )}
                </>
              }
            >
              {deleteStep === "confirmation" ? (
                <Field
                  label="Type DELETE MY ACCOUNT to continue"
                  hint="Type the phrase exactly as shown. Nothing is deleted at this step."
                >
                  {(inputProps) => (
                    <Input
                      {...inputProps}
                      value={deleteConfirmation}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                    />
                  )}
                </Field>
              ) : (
                <div className="flex flex-col gap-4">
                  <p>
                    Your profile and access to your connections and
                    conversations will be removed. You cannot undo this action.
                  </p>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0"
                      checked={deleteAcknowledged}
                      disabled={isDeleting}
                      onChange={(event) =>
                        setDeleteAcknowledged(event.target.checked)
                      }
                    />
                    I understand that this permanently deletes my account.
                  </label>
                  {failure && <Alert>{failure}</Alert>}
                </div>
              )}
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="text-sm font-semibold">{label}</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((t) => (
          <li key={t}>
            <Badge>{t}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
