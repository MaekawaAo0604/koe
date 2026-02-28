"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { TestimonialCard } from "./testimonial-card";
import type { Testimonial } from "@/types/index";

interface TestimonialListProps {
  initialTestimonials: Testimonial[];
}

function TestimonialListInner({ initialTestimonials }: TestimonialListProps) {
  const [allTestimonials, setAllTestimonials] =
    useState<Testimonial[]>(initialTestimonials);
  const searchParams = useSearchParams();

  useEffect(() => {
    setAllTestimonials(initialTestimonials);
  }, [initialTestimonials]);

  const status = searchParams.get("status");
  const rating = searchParams.get("rating")
    ? Number(searchParams.get("rating"))
    : null;
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];

  const testimonials = useMemo(() => {
    return allTestimonials.filter((t) => {
      if (status && status !== "all" && t.status !== status) return false;
      if (rating !== null && t.rating !== rating) return false;
      if (tags.length > 0 && !tags.some((tag) => t.tags?.includes(tag)))
        return false;
      return true;
    });
  }, [allTestimonials, status, rating, tags]);

  function handleUpdate(updated: Testimonial) {
    setAllTestimonials((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  function handleDelete(id: string) {
    setAllTestimonials((prev) => prev.filter((t) => t.id !== id));
  }

  if (testimonials.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        data-testid="empty-state"
      >
        <MessageSquare
          className="w-12 h-12 mb-4 opacity-30"
          aria-hidden="true"
        />
        <p className="text-lg font-medium mb-1">
          お客様の声がありません
        </p>
        <p className="text-sm text-center max-w-xs">
          フィルターを変更するか、フォームURLを共有してお客様の声を収集しましょう。
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="testimonial-list"
    >
      {testimonials.map((testimonial) => (
        <TestimonialCard
          key={testimonial.id}
          testimonial={testimonial}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

export function TestimonialList({ initialTestimonials }: TestimonialListProps) {
  return (
    <Suspense
      fallback={
        <div
          className="h-48 animate-pulse rounded-lg bg-muted"
          aria-hidden="true"
        />
      }
    >
      <TestimonialListInner initialTestimonials={initialTestimonials} />
    </Suspense>
  );
}
