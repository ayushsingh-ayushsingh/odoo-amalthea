import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { NavigationMenuProps } from "@radix-ui/react-navigation-menu";
import Link from "next/link";

export const NavMenu = (props: NavigationMenuProps) => (
  <NavigationMenu {...props}>
    <NavigationMenuList className="gap-6 space-x-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start">
      <NavigationMenuItem>
        <Link href="#features">Features</Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="#pricing">Pricing</Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="#faq">FAQ</Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="#testimonials">Testimonials</Link>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
);
