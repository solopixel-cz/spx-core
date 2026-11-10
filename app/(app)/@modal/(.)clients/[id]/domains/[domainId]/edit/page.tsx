import Page from "@/app/(app)/clients/[id]/domains/[domainId]/edit/page";
import { FormModalScope } from "@/components/form-modal";

/** `/clients/[id]/domains/[domainId]/edit` jako modál nad aktuální stránkou; napřímo je to stránka. */
export default function Modal(props: React.ComponentProps<typeof Page>) {
  return (
    <FormModalScope>
      <Page {...props} />
    </FormModalScope>
  );
}
