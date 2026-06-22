from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APPS = ["admin-dashboard", "patient-portal", "provider-portal", "integration-console", "public-website"]


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def app_title(name: str) -> str:
    return " ".join(part.capitalize() for part in name.split("-"))


def package_json(name: str) -> dict:
    scripts = {"build": "vite build", "test": "vitest run"}
    return {
        "name": f"healthbridge-{name}",
        "version": "0.1.0",
        "private": True,
        "type": "module",
        "scripts": scripts,
        "dependencies": {
            "@vitejs/plugin-react": "^5.1.1",
            "vite": "^7.2.7",
            "typescript": "^5.9.3",
            "react": "^19.2.3",
            "react-dom": "^19.2.3",
            "vitest": "^4.0.15",
        },
        "devDependencies": {
            "@types/react": "^19.2.7",
            "@types/react-dom": "^19.2.3",
            "jsdom": "^27.3.0",
        },
    }


def main() -> None:
    for name in APPS:
        title = app_title(name)
        write(f"apps/{name}/package.json", json.dumps(package_json(name), indent=2) + "\n")
        write(
            f"apps/{name}/index.html",
            f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""",
        )
        write(
            f"apps/{name}/src/main.tsx",
            """import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
""",
        )
        write(
            f"apps/{name}/tsconfig.json",
            """{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}
""",
        )
        write(
            f"apps/{name}/vite.config.ts",
            """import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
""",
        )
        write(
            f"apps/{name}/src/App.test.tsx",
            f"""import {{ describe, expect, it }} from "vitest";
import {{ App }} from "./App";

describe("{name} app", () => {{
  it("exports a renderable app component", () => {{
    expect(typeof App).toBe("function");
  }});
}});
""",
        )
        if name == "public-website":
            write(
                f"apps/{name}/src/styles.css",
                """:root {
  font-family: Inter, system-ui, sans-serif;
  color: #1b1f23;
  background: #f7f9fb;
}
""",
            )


if __name__ == "__main__":
    main()
