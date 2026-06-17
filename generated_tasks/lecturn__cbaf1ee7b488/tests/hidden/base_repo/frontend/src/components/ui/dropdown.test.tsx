import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown";

describe("Dropdown", () => {
  it("opens on trigger click and reveals items", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Header</DropdownMenuLabel>
          <DropdownMenuItem>One</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Two</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("fires onSelect when an item is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Pick</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByText("Pick"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("forwards className overrides on Content / Item / Label / Separator", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>O</DropdownMenuTrigger>
        <DropdownMenuContent className="content-x">
          <DropdownMenuLabel className="label-x">L</DropdownMenuLabel>
          <DropdownMenuSeparator className="sep-x" />
          <DropdownMenuItem className="item-x">I</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByText("O"));
    expect(document.querySelector(".content-x")).not.toBeNull();
    expect(document.querySelector(".label-x")).not.toBeNull();
    expect(document.querySelector(".sep-x")).not.toBeNull();
    expect(document.querySelector(".item-x")).not.toBeNull();
  });
});
