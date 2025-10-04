import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";

export const NavigationSheet = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Menu strokeWidth={3} />
        </Button>
      </SheetTrigger>
      <SheetContent className="p-4">
        <SheetHeader className="sr-only">
          <SheetTitle className="sr-only">Navigation Sidebar</SheetTitle>
          <SheetDescription className="sr-only">
            This is the navigation sidebar.
          </SheetDescription>
        </SheetHeader>
        <Logo />
        <NavMenu orientation="vertical" className="mt-12 text-lg" />
        <div className="mt-8 space-y-4">
          <Button className="w-full sm:hidden" asChild>
            <Link href="/sign-in">
              Get Started
            </Link>
          </Button>
          <Button className="w-full sm:hidden" variant="outline" asChild>
            <SheetClose>
              Close
            </SheetClose>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
