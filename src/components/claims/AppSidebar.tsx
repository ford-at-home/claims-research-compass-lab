import { Link, useRouterState } from "@tanstack/react-router";
import { FlaskConical, Car, Wrench, CalendarClock, CloudHail, Network, Info, Link2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { to: "/uc01", id: "UC01", title: "Salvage valuation", icon: Car },
  { to: "/uc02", id: "UC02", title: "Damage estimate", icon: Wrench },
  { to: "/uc03", id: "UC03", title: "Rental baseline", icon: CalendarClock },
  { to: "/uc04", id: "UC04", title: "Loss verification", icon: CloudHail },
  { to: "/uc05", id: "UC05", title: "War room (MCP)", icon: Network },
  { to: "/lienloop", id: "UC06", title: "LienLoop total-loss desk", icon: Link2 },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <FlaskConical className="h-5 w-5 shrink-0 text-sidebar-primary" />
          <span className="truncate text-sm font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">Claims Research Lab</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Use cases</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.to}>
                  <SidebarMenuButton asChild isActive={path === i.to} tooltip={`${i.id} ${i.title}`}>
                    <Link to={i.to}>
                      <i.icon className="h-4 w-4" />
                      <span className="font-mono text-[11px] text-sidebar-primary">{i.id}</span>
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/"} tooltip="About">
                  <Link to="/">
                    <Info className="h-4 w-4" />
                    <span>About & configuration</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
