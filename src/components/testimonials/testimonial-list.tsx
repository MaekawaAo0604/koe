"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { TestimonialCard } from "./testimonial-card";
import type { Testimonial } from "@/types/index";

interface TestimonialListProps {
  initialTestimonials: Testimonial[];
}

export function TestimonialList({ initialTestimonials }: TestimonialListProps) {
  const [testimonials, setTestimonials] =
    useState<Testimonial[]>(initialTestimonials);

  // フィルタ変更時（searchParams が変わり initialTestimonials が再渡しされた時）に同期
  useEffect(() => {
    setTestimonials(initialTestimonials);
  }, [initialTestimonials]);

  function handleUpdate(updated: Testimonial) {
    setTestimonials((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  function handleDelete(id: string) {
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
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
          テスティモニアルがありません
        </p>
        <p className="text-sm text-center max-w-xs">
          フィルターを変更するか、フォームURLを共有してテスティモニアルを収集しましょう。
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
