import { Separator } from "@/components/ui/separator";
import { ManualAllowListForm } from "./manual-list-form";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { fetchFidsFromGists } from "@/utils/gists";

export default async function SettingsProfilePage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["manual_fids"],
    queryFn: () => fetchFidsFromGists(),
  });
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">CoOwncaster AllowList</h3>
        <p className="text-sm text-muted-foreground">
          Manually update the list of users inside the allow list.
        </p>
      </div>
      <Separator />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ManualAllowListForm />
      </HydrationBoundary>
    </div>
  );
}
