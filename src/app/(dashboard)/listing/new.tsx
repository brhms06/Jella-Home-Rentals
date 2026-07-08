import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { createListing, pickAndUploadPhoto, type ListingInput } from "@/lib/listings";
import { ListingForm } from "@/components/listing-form";

export default function NewListing() {
  const { session } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handlePickPhoto() {
    if (!session) return;
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadPhoto(session.user.id);
      if (url) setPhotos((prev) => [...prev, url]);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(input: ListingInput) {
    if (!session) return;
    setSubmitting(true);
    try {
      await createListing(input, session.user.id);
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ListingForm
      photos={photos}
      onPickPhoto={handlePickPhoto}
      uploadingPhoto={uploadingPhoto}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Create listing"
    />
  );
}
