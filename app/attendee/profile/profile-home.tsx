"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  Skeleton,
  Dialog,
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

  useEffect(() => {
    api.GET("/me/profile").then(({ data, error, response }) => {
      if (data) setProfile(data);
      else if (response.status === 404)
        router.replace("/attendee/profile/edit?onboarding=1");
      else setFailure(errorMessage(error));
    });
  }, [router]);

  async function handleDeleteConfirm() {
    const { error } = await api.DELETE("/me");
    if (error) {
      setFailure(errorMessage(error));
    } else {
      router.replace("/attendee/sign-in");
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
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete account
              </Button>
            </div>
          </section>
          {showDeleteDialog && (
            <Dialog
              open={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              title="Delete account"
              description="This will permanently delete your account. This action cannot be undone. Your connections may already have copied or seen your data."
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleDeleteConfirm();
                      setShowDeleteDialog(false);
                    }}
                  >
                    Delete
                  </Button>
                </>
              }
            />
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
