import Page from "@/app/(app)/tasks/[id]/edit/page";
import { FormModalScope } from "@/components/form-modal";

/** `/tasks/[id]/edit` jako modál nad aktuální stránkou; napřímo je to stránka. */
export default function Modal(props: React.ComponentProps<typeof Page>) {
  return (
    <FormModalScope>
      <Page {...props} />
    </FormModalScope>
  );
}
