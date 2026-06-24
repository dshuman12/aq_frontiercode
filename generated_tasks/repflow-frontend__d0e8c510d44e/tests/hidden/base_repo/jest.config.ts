import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
    dir: "./",
});

const config: Config = {
    coverageProvider: "v8",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    collectCoverageFrom: [
        "lib/error-messages.ts",
        "hooks/use-error-handler.ts",
        "components/ui/loading-spinner.tsx",
        "components/ui/error-display.tsx",
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
        "lib/error-messages.ts": {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        "hooks/use-error-handler.ts": {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        "components/ui/loading-spinner.tsx": {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        "components/ui/error-display.tsx": {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
    testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

export default createJestConfig(config);
