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

export function ProfileHome() {
  const router = useRouter();
  const [profile, setProfile] = useState<Schemas["OwnProfile"] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    api.GET("/me/profile").then(({ data, error, response }) => {
      if (data) setProfile(data);
      else if (response.status === 404)
        router.replace("/attendee/profile/edit?onboarding=1");
      else setFailure(errorMessage(error));
    });
  }, [router]);

  async function handleBlockConfirm() {
    const { error } = await api.POST("/blocks", {
      body: { attendee_id: profile?.attendee_id ?? "" },
    });
    if (error) {
      setFailure(errorMessage(error));
    }
  }

  async function handleReportConfirm() {
    const { error } = await api.POST("/reports", {
      body: {
        target_type: "profile",
        target_id: profile?.attendee_id ?? "unknown",
        reason: "harassment",
      },
    });
    if (error) {
      setFailure(errorMessage(error));
    }
  }

  async function handleDeleteConfirm() {
    const { error } = await api.DELETE("/me");
    if (error) {
      setFailure(errorMessage(error));
    } else {
      router.replace("/attendee/sign-in");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Your profile</h1>
      </div>
      {failure && <Alert>{failure}</Alert>}
      {!profile && !failure && <Skeleton className="h-48" />}
      {profile && (
        <>
          <Card className="flex flex-col gap-4">
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
                      <span>
                        <span className="font-semibold">
                          {LINK_LABELS[l.kind]}:
                        </span>{" "}
                        {l.value}
                      </span>
                      <Badge
                        tone={l.visibility === "hidden" ? "neutral" : "accent"}
                      >
                        {VISIBILITY_LABELS[l.visibility]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/attendee/profile/edit">Edit profile</ButtonLink>
            <ButtonLink href="/attendee/profile/preview" variant="secondary">
              Preview how others see me
            </ButtonLink>
            <ButtonLink href="/attendee/profile/settings" variant="secondary">
              Privacy settings
            </ButtonLink>
            <Button variant="danger" onClick={() => setShowBlockDialog(true)}>
              Block
            </Button>
            <Button variant="danger" onClick={() => setShowReportDialog(true)}>
              Report
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
              Delete account
            </Button>
          </div>
          {showBlockDialog && (
            <Dialog
              open={showBlockDialog}
              onClose={() => setShowBlockDialog(false)}
              title="Block this person"
              description="Are you sure you want to block this attendee? They will not be able to connect with you or see your profile at shared events."
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setShowBlockDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleBlockConfirm();
                      setShowBlockDialog(false);
                    }}
                  >
                    Block
                  </Button>
                </>
              }
            />
          )}
          {showReportDialog && (
            <Dialog
              open={showReportDialog}
              onClose={() => setShowReportDialog(false)}
              title="Report this person"
              description="Why are you reporting this attendee?"
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setShowReportDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleReportConfirm();
                      setShowReportDialog(false);
                    }}
                  >
                    Report
                  </Button>
                </>
              }
            />
          )}
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
