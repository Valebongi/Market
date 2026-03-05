"use client";

import { useState, useEffect } from "react";
import { User, Settings, Bell, Shield, CreditCard, Camera, Check } from "lucide-react";
import Input, { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { usersApi } from "@/lib/api";

const SETTINGS_TABS = [
  { id: "profile", label: "Perfil Público", icon: <User className="h-4 w-4" /> },
  { id: "account", label: "Cuenta", icon: <Settings className="h-4 w-4" /> },
  { id: "notifications", label: "Notificaciones", icon: <Bell className="h-4 w-4" /> },
  { id: "security", label: "Seguridad", icon: <Shield className="h-4 w-4" /> },
  { id: "billing", label: "Plan y Facturación", icon: <CreditCard className="h-4 w-4" /> },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-fog-gray last:border-0">
      <div>
        <p className="text-sm font-medium text-carbon-gray">{label}</p>
        {description && <p className="text-xs text-slate-gray mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full shrink-0 transition-colors",
          checked ? "bg-electric-blue" : "bg-fog-gray"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [profile, setProfile] = useState({
    displayName: "",
    bio: "",
    website: "",
    linkedin: "",
    twitter: "",
    github: "",
    location: "",
  });

  const [notifications, setNotifications] = useState({
    newRequest: true,
    newMessage: true,
    assetUpdates: false,
    newsletter: false,
    weeklyReport: true,
  });

  // Load real profile data on mount
  useEffect(() => {
    if (!user) return;
    setLoadingProfile(true);
    usersApi.getProfile(user.id)
      .then((data) => {
        setProfile({
          displayName: data.displayName || user.profile?.displayName || "",
          bio: data.bio || "",
          website: data.website || "",
          linkedin: data.linkedinUrl || "",
          twitter: data.twitterUrl || "",
          github: data.githubUrl || "",
          location: data.location || "",
        });
        if (data.notificationSettings) {
          setNotifications({
            newRequest: data.notificationSettings.newRequest ?? true,
            newMessage: data.notificationSettings.newMessage ?? true,
            assetUpdates: data.notificationSettings.assetUpdates ?? false,
            newsletter: data.notificationSettings.newsletter ?? false,
            weeklyReport: data.notificationSettings.weeklyReport ?? true,
          });
        }
      })
      .catch(() => {
        // Use auth context data as fallback
        setProfile((p) => ({
          ...p,
          displayName: user.profile?.displayName || user.email,
        }));
      })
      .finally(() => setLoadingProfile(false));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaveError("");
    try {
      await usersApi.updateProfile(user.id, {
        displayName: profile.displayName,
        bio: profile.bio || undefined,
        website: profile.website || undefined,
        linkedinUrl: profile.linkedin || undefined,
        twitterUrl: profile.twitter || undefined,
        githubUrl: profile.github || undefined,
        location: profile.location || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Error al guardar");
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSaveError("");
    try {
      await usersApi.updateNotifications(user.id, notifications);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Error al guardar");
    }
  };

  return (
    <div className="p-8 max-w-standard mx-auto">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray">
        <h1 className="text-3xl font-bold text-carbon-gray">Configuración</h1>
        <p className="text-base text-slate-gray mt-1">Gestioná tu cuenta y preferencias</p>
      </div>

      <div className="mt-8 flex gap-8">
        {/* Sidebar */}
        <nav className="w-56 shrink-0">
          <ul className="space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                    activeTab === tab.id
                      ? "bg-snow-gray text-electric-blue border-l-[3px] border-electric-blue pl-[13px]"
                      : "text-slate-gray hover:bg-snow-gray hover:text-carbon-gray"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* PERFIL PÚBLICO */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-carbon-gray">Perfil Público</h2>
                <p className="text-sm text-slate-gray mt-1">Esta información será visible para otros usuarios</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar name={profile.displayName} size="xl" />
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-electric-blue text-white rounded-full flex items-center justify-center shadow-medium hover:bg-blue-700 transition-colors">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-carbon-gray">Foto de perfil</p>
                  <p className="text-xs text-slate-gray mt-0.5">JPG, PNG · Máx. 2MB</p>
                  <Button variant="ghost" size="sm" className="mt-2">Cambiar foto</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <Input
                  label="Nombre de Usuario / Empresa"
                  value={profile.displayName}
                  onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                  helperText="Este será tu identificador público"
                  required
                />
                <Textarea
                  label="Biografía"
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  maxLength={300}
                  showCount
                  placeholder="Contanos sobre vos y tus proyectos"
                />
                <Input
                  label="Website / Portfolio"
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://tu-sitio.com"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="LinkedIn"
                    value={profile.linkedin}
                    onChange={(e) => setProfile((p) => ({ ...p, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/usuario"
                  />
                  <Input
                    label="Twitter / X"
                    value={profile.twitter}
                    onChange={(e) => setProfile((p) => ({ ...p, twitter: e.target.value }))}
                    placeholder="@usuario"
                  />
                  <Input
                    label="GitHub"
                    value={profile.github}
                    onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))}
                    placeholder="usuario"
                  />
                  <Input
                    label="Ubicación"
                    value={profile.location}
                    onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Ciudad, País"
                  />
                </div>
              </div>

              {saveError && <p className="text-xs text-soft-coral">{saveError}</p>}
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} icon={saved ? <Check className="h-4 w-4" /> : undefined} variant={saved ? "success" : "primary"}>
                  {saved ? "¡Guardado!" : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}

          {/* CUENTA */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-carbon-gray">Configuración de Cuenta</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-snow-gray rounded-xl border border-fog-gray">
                  <div>
                    <p className="text-sm font-medium text-carbon-gray">Email actual</p>
                    <p className="text-sm text-slate-gray">{user?.email || "—"}</p>
                  </div>
                  <Button variant="secondary" size="sm">Cambiar email</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-carbon-gray block mb-2">Idioma</label>
                    <select className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white text-carbon-gray focus:outline-none focus:border-electric-blue">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-carbon-gray block mb-2">Zona Horaria</label>
                    <select className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm bg-white text-carbon-gray focus:outline-none focus:border-electric-blue">
                      <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
                      <option value="America/New_York">Nueva York (UTC-5)</option>
                      <option value="Europe/Madrid">Madrid (UTC+1)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-fog-gray">
                <h3 className="text-base font-semibold text-soft-coral mb-2">Zona de Peligro</h3>
                <p className="text-sm text-slate-gray mb-4">Esta acción es irreversible. Se eliminarán todos tus datos.</p>
                <Button variant="destructive" size="sm">Eliminar mi cuenta</Button>
              </div>
            </div>
          )}

          {/* NOTIFICACIONES */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-carbon-gray">Preferencias de Notificaciones</h2>
              </div>

              <div className="bg-white border border-fog-gray rounded-xl px-6">
                <h3 className="text-sm font-semibold text-slate-gray uppercase tracking-wide py-4 border-b border-fog-gray">
                  Notificaciones por Email
                </h3>
                <Toggle
                  checked={notifications.newRequest}
                  onChange={() => setNotifications((n) => ({ ...n, newRequest: !n.newRequest }))}
                  label="Nueva solicitud de licencia"
                  description="Te notificamos cuando alguien solicita licenciar tu activo"
                />
                <Toggle
                  checked={notifications.newMessage}
                  onChange={() => setNotifications((n) => ({ ...n, newMessage: !n.newMessage }))}
                  label="Nuevo mensaje"
                  description="Cuando hay un mensaje nuevo en una conversación"
                />
                <Toggle
                  checked={notifications.assetUpdates}
                  onChange={() => setNotifications((n) => ({ ...n, assetUpdates: !n.assetUpdates }))}
                  label="Actualizaciones de activos"
                  description="Cuando un activo que seguís cambia de estado"
                />
                <Toggle
                  checked={notifications.newsletter}
                  onChange={() => setNotifications((n) => ({ ...n, newsletter: !n.newsletter }))}
                  label="Newsletter mensual"
                  description="Resumen de novedades de la plataforma"
                />
              </div>

              <div className="bg-white border border-fog-gray rounded-xl px-6">
                <h3 className="text-sm font-semibold text-slate-gray uppercase tracking-wide py-4 border-b border-fog-gray">
                  Resumen Semanal
                </h3>
                <Toggle
                  checked={notifications.weeklyReport}
                  onChange={() => setNotifications((n) => ({ ...n, weeklyReport: !n.weeklyReport }))}
                  label="Recibir resumen de actividad"
                  description="Un email semanal con tus métricas y novedades"
                />
              </div>

              <Button onClick={handleSaveNotifications} variant={saved ? "success" : "primary"}>
                {saved ? "¡Guardado!" : "Guardar Preferencias"}
              </Button>
            </div>
          )}

          {/* SEGURIDAD */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-carbon-gray">Seguridad</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white border border-fog-gray rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-carbon-gray">Contraseña</p>
                    <p className="text-xs text-slate-gray mt-0.5">Última actualización: hace 3 meses</p>
                  </div>
                  <Button variant="secondary" size="sm">Cambiar contraseña</Button>
                </div>
                <div className="p-4 bg-white border border-fog-gray rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-carbon-gray">Sesiones activas</p>
                    <p className="text-xs text-slate-gray mt-0.5">2 dispositivos activos</p>
                  </div>
                  <Button variant="ghost" size="sm">Ver sesiones</Button>
                </div>
                <div className="p-4 bg-white border border-fog-gray rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-carbon-gray">Exportar mis datos</p>
                    <p className="text-xs text-slate-gray mt-0.5">Descargá toda tu información en JSON</p>
                  </div>
                  <Button variant="ghost" size="sm">Descargar</Button>
                </div>
              </div>
            </div>
          )}

          {/* PLAN Y FACTURACIÓN */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-carbon-gray">Plan y Facturación</h2>
              </div>
              <div className="bg-white border-2 border-fog-gray rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="inline-block px-3 py-1 bg-fog-gray text-slate-gray text-xs font-semibold rounded-full mb-2">
                      Plan Gratuito
                    </span>
                    <h3 className="text-lg font-semibold text-carbon-gray">Plan actual</h3>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {[
                    "Hasta 3 activos publicados",
                    "Solicitudes ilimitadas",
                    "Mensajería básica",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-carbon-gray">
                      <Check className="h-4 w-4 text-deep-emerald" />
                      {f}
                    </li>
                  ))}
                  {[
                    "Estadísticas avanzadas",
                    "Posicionamiento destacado",
                    "Publicación ilimitada",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-gray opacity-60">
                      <span className="h-4 w-4 rounded-full border border-fog-gray flex items-center justify-center" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div>
                  <p className="text-sm text-slate-gray mb-3">
                    <strong>Uso actual:</strong> 3 / 3 activos publicados
                  </p>
                  <div className="h-2 bg-fog-gray rounded-full">
                    <div className="h-2 bg-soft-coral rounded-full w-full" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-midnight-blue to-electric-blue rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-2">Plan Premium</h3>
                <p className="text-sm text-white/70 mb-4">Publicación ilimitada, estadísticas avanzadas y mayor visibilidad.</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-white/60">/mes</span>
                </div>
                <Button variant="success" className="w-full">
                  Actualizar a Premium
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
