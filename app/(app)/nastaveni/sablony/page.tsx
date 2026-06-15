"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";
import { renderOutreachEmail } from "@/lib/email-templates/outreach";
import { renderFollowupEmail } from "@/lib/email-templates/followup";
import { renderDeliveryEmail } from "@/lib/email-templates/delivery";

export default function SablonyPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">E-mailové šablony</h2>

      <Tabs defaultValue="outreach">
        <TabsList>
          <TabsTrigger value="outreach">Oslovení</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
          <TabsTrigger value="delivery">Předání vizitky</TabsTrigger>
        </TabsList>

        <TabsContent value="outreach" className="mt-4">
          <EmailTemplateEditor
            apiPath="/api/templates/outreach-email"
            renderEmail={renderOutreachEmail}
            defaultSubject="{{jmeno}}, takhle dnes vypadá vizitka, co pracuje za vás"
            placeholderHint={`Editovatelný je jen předmět — tělo e-mailu je v jednotném designu SoloPixel. Placeholdery: {{jmeno}} (oslovení, 5. pád), {{odkaz}} (demo URL).`}
            sampleVars={{ jmeno: "Jan Nováku", odkaz: "https://demo.solopixel.cz" }}
            label="Šablona oslovení"
          />
        </TabsContent>

        <TabsContent value="followup" className="mt-4">
          <EmailTemplateEditor
            apiPath="/api/templates/followup-email"
            renderEmail={renderFollowupEmail}
            defaultSubject="{{jmeno}}, ještě jednou — vaše vizitka na 30 sekund"
            placeholderHint={`Druhý e-mail pro prospekty, kteří první oslovení otevřeli, ale neklikli. Editovatelný je jen předmět. Placeholdery: {{jmeno}} (oslovení, 5. pád), {{odkaz}} (demo URL).`}
            sampleVars={{ jmeno: "Jan Nováku", odkaz: "https://demo.solopixel.cz" }}
            label="Šablona follow-up"
          />
        </TabsContent>

        <TabsContent value="delivery" className="mt-4">
          <EmailTemplateEditor
            apiPath="/api/templates/delivery-email"
            renderEmail={renderDeliveryEmail}
            defaultSubject="{{jmeno}}, vaše vizitka je hotová"
            placeholderHint={`E-mail odeslaný klientovi při předání hotové vizitky. Editovatelný je jen předmět. Placeholdery: {{jmeno}} (oslovení, 5. pád), {{odkaz}} (URL vizitky).`}
            sampleVars={{ jmeno: "Jane", odkaz: "https://demo.solopixel.cz" }}
            label="Šablona předání"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
