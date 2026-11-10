import Page from "@/app/(app)/prospects/new/page";
import { FormModalScope } from "@/components/form-modal";

/** `/prospects/new` jako modál nad aktuální stránkou; napřímo je to stránka. */
export default function Modal() {
  return (
    <FormModalScope>
      <Page />
    </FormModalScope>
  );
}
