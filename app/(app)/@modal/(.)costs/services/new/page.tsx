import Page from "@/app/(app)/costs/services/new/page";
import { FormModalScope } from "@/components/form-modal";

/** `/costs/services/new` jako modál nad aktuální stránkou; napřímo je to stránka. */
export default function Modal() {
  return (
    <FormModalScope>
      <Page />
    </FormModalScope>
  );
}
