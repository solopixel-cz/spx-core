import Page from "@/app/(app)/domains/new/page";
import { FormModalScope } from "@/components/form-modal";

/** `/domains/new` jako modál nad aktuální stránkou; napřímo je to stránka. */
export default function Modal() {
  return (
    <FormModalScope>
      <Page />
    </FormModalScope>
  );
}
