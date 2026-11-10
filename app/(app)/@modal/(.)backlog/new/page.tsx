import Page from "@/app/(app)/backlog/new/page";
import { FormModalScope } from "@/components/form-modal";

/** `/backlog/new` jako modál nad aktuální stránkou; napřímo je to stránka. */
export default function Modal(props: React.ComponentProps<typeof Page>) {
  return (
    <FormModalScope>
      <Page {...props} />
    </FormModalScope>
  );
}
