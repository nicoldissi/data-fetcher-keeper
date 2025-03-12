
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface UserProfileCardProps {
  userEmail: string | null;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function UserProfileCard({ userEmail, loading, setLoading }: UserProfileCardProps) {
  const handleChangePassword = async () => {
    if (!userEmail) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email envoyé",
        description: "Vérifiez votre email pour réinitialiser votre mot de passe",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi de l'email",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations de compte</CardTitle>
        <CardDescription>
          Consultez et modifiez les informations de votre compte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={userEmail || ""} readOnly />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleChangePassword} disabled={loading}>
          {loading ? "Traitement..." : "Changer le mot de passe"}
        </Button>
      </CardFooter>
    </Card>
  );
}
