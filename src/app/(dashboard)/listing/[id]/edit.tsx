import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { fetchListing, updateListing, pickAndUploadPhoto, type Listing, type ListingInput } from "@/lib/listings";
import { ListingForm } from "@/components/listing-form";

export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchListing(id).then((data) => {
        if (cancelled) return;
        setListing(data);
        setPhotos(data.photos);
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

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
    setSubmitting(true);
    try {
      await updateListing(id, input);
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  if (!listing) return null;

  return (
    <ListingForm
      initial={listing}
      photos={photos}
      onPickPhoto={handlePickPhoto}
      uploadingPhoto={uploadingPhoto}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Save changes"
    />
  );
}
