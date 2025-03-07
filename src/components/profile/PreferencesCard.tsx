
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PreferencesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences</CardTitle>
        <CardDescription>
          Personnalisez vos préférences d'affichage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Fonctionnalités à venir dans une future mise à jour.
        </p>
      </CardContent>
    </Card>
  );
}
