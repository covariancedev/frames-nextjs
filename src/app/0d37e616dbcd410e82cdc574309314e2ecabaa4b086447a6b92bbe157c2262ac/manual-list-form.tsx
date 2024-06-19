"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { LoaderIcon, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFidsFromGists, updateFidsToGists } from "@/utils/gists";
import { ToastAction } from "@/components/ui/toast";
import { useEffect, useState } from "react";

const profileFormSchema = z.object({
  fids: z
    .array(
      z.object({
        value: z.string({ message: "Please enter a valid FID." }),
      })
    )
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ManualAllowListForm() {
  // Access the client
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Queries
  const query = useQuery({
    queryKey: ["manual_fids"],
    queryFn: () => fetchFidsFromGists(),
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fids: [] },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    name: "fids",
    control: form.control,
  });
  // Mutations
  const update = useMutation({
    mutationFn: ({ old, fids }: { old: number[]; fids: number[] }) => {
      return updateFidsToGists({ old, fids });
    },
    onSettled: async (data, error) => {
      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to update Fids",
          description: error.message,
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        });
      } else if (data) {
        toast({
          title: "Fids have been updated",
          description: "Fids have been updated successfully.",
        });
        form.setValue(
          "fids",
          data.map((fid) => ({ value: fid.toString() }))
        );
      }
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["fids"] });
    },
  });

  useEffect(() => {
    if (!query.isLoading && query.data) {
      const fids = query.data.map((fid) => ({ value: fid.toString() }));
      console.log("ManualAllowListForm >> useeffect fids", fids, {
        data: query.data,
      });

      form.setValue("fids", fids);
    }
  }, [query.isLoading, query.data]);

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center flex-row gap-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-9 w-[200px]" />
      </div>
    );
  }

  function onSubmit(data: ProfileFormValues) {
    if (!data.fids?.filter((f) => f.value === "").length) {
      setSubmitting(true);
      console.log("ManualAllowListForm >> onSubmit data", data);

      const fids = data.fids?.map((f) => Number(f.value)) ?? [];
      update.mutate(
        { old: query.data ?? [], fids },
        {
          onSettled: () => {
            setSubmitting(false);
          },
        }
      );
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div>
            {fields.map((field, index) => (
              <FormField
                control={form.control}
                key={field.id}
                name={`fids.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(index !== 0 && "sr-only")}>
                      FIDs
                    </FormLabel>
                    <FormDescription className={cn(index !== 0 && "sr-only")}>
                      Add Fids of users you want to manually allow
                    </FormDescription>
                    <FormControl>
                      <div className="flex flex-row gap-3">
                        <Input {...field} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ value: "" })}
            >
              Add a user FID
            </Button>
          </div>
          <Button disabled={submitting} type="submit">
            {submitting ? (
              <LoaderIcon className="animate-spin" />
            ) : (
              "Update user ids"
            )}
          </Button>
        </form>
      </Form>
    </>
  );
}
