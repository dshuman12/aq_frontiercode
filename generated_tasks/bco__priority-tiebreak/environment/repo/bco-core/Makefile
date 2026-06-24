# bco-core: C shared library (libbconet) for macOS and Android.
# Requires: Go 1.26.1+, C toolchain (Xcode CLT on macOS). Android targets need NDK.

MODULE_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BUILD_DIR := $(MODULE_DIR)/build

UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)
# NDK prebuilt folder name matches host OS/arch (Android NDK r23+).
ifeq ($(UNAME_S),Darwin)
  ifeq ($(UNAME_M),arm64)
    NDK_HOST_TAG := darwin-arm64
  else
    NDK_HOST_TAG := darwin-x86_64
  endif
else ifeq ($(UNAME_S),Linux)
  ifneq (,$(filter aarch64 arm64,$(UNAME_M)))
    NDK_HOST_TAG := linux-aarch64
  else
    NDK_HOST_TAG := linux-x86_64
  endif
else
  NDK_HOST_TAG := $(UNAME_S)-$(UNAME_M)
endif

# Apple Silicon: many NDK releases only ship darwin-x86_64 prebuilts (Rosetta). Prefer darwin-arm64
# when present, otherwise fall back so `make android-arm64` still finds clang.
ifneq (,$(ANDROID_NDK_HOME))
  ifeq ($(UNAME_S)-$(UNAME_M),Darwin-arm64)
    ifeq (,$(wildcard $(ANDROID_NDK_HOME)/toolchains/llvm/prebuilt/darwin-arm64/bin))
      NDK_HOST_TAG := darwin-x86_64
    endif
  endif
endif

ANDROID_API ?= 21
ANDROID_CC_ARM64 := $(ANDROID_NDK_HOME)/toolchains/llvm/prebuilt/$(NDK_HOST_TAG)/bin/aarch64-linux-android$(ANDROID_API)-clang
ANDROID_CC_AMD64 := $(ANDROID_NDK_HOME)/toolchains/llvm/prebuilt/$(NDK_HOST_TAG)/bin/x86_64-linux-android$(ANDROID_API)-clang

GO := go
LDFLAGS := -trimpath

.PHONY: all help test test-ci cover cover-html cover-check clean \
	macos-arm64 macos-amd64 macos-universal \
	android-arm64 android-amd64

all: macos-universal

help:
	@echo "Targets:"
	@echo "  macos-arm64      - libbconet.dylib (Apple Silicon)"
	@echo "  macos-amd64      - libbconet.dylib (Intel)"
	@echo "  macos-universal  - lipo arm64 + amd64 -> libbconet.dylib (macOS only)"
	@echo "  android-arm64    - libbconet.so (requires ANDROID_NDK_HOME)"
	@echo "  android-amd64    - libbconet.so x86_64 emulator (requires ANDROID_NDK_HOME)"
	@echo "  test             - go test -race ./... (includes optional !ci tests)"
	@echo "  test-ci          - go test -race -tags=ci ./... (excludes //go:build !ci files)"
	@echo "  cover            - go test -race -cover -coverprofile=coverage.out ./..."
	@echo "  cover-html       - runs cover, then writes coverage.html (open in browser)"
	@echo "  cover-check      - scripts/cover-check.sh: gate primary package >90% (see quickstart)"
	@echo "  clean            - remove $(BUILD_DIR)"
	@echo "Variables: ANDROID_NDK_HOME, ANDROID_API (default $(ANDROID_API))"

test:
	cd $(MODULE_DIR) && CGO_ENABLED=1 $(GO) test -race ./...

test-ci:
	cd $(MODULE_DIR) && CGO_ENABLED=1 $(GO) test -race -tags=ci ./...

cover:
	cd $(MODULE_DIR) && CGO_ENABLED=1 $(GO) test -race -cover -coverprofile=coverage.out ./...

cover-html: cover
	cd $(MODULE_DIR) && $(GO) tool cover -html=coverage.out -o coverage.html

cover-check:
	cd $(MODULE_DIR) && ./scripts/cover-check.sh

clean:
	rm -rf $(BUILD_DIR)

macos-arm64:
	@mkdir -p $(BUILD_DIR)/macos-arm64
	cd $(MODULE_DIR) && CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 \
		$(GO) build -buildmode=c-shared $(LDFLAGS) \
		-o $(BUILD_DIR)/macos-arm64/libbconet.dylib .

macos-amd64:
	@mkdir -p $(BUILD_DIR)/macos-amd64
	cd $(MODULE_DIR) && CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 \
		$(GO) build -buildmode=c-shared $(LDFLAGS) \
		-o $(BUILD_DIR)/macos-amd64/libbconet.dylib .

macos-universal: macos-arm64 macos-amd64
	@if [ "$(UNAME_S)" != "Darwin" ]; then \
		echo "macos-universal requires macOS (lipo). Build macos-arm64 and macos-amd64 separately on other hosts."; \
		exit 1; \
	fi
	@command -v lipo >/dev/null || (echo "lipo not found"; exit 1)
	@mkdir -p $(BUILD_DIR)/macos-universal
	lipo -create \
		$(BUILD_DIR)/macos-arm64/libbconet.dylib \
		$(BUILD_DIR)/macos-amd64/libbconet.dylib \
		-output $(BUILD_DIR)/macos-universal/libbconet.dylib
	@# Go emits libbconet.h only when the package has //export symbols (see capi.go).
	@if [ -f $(BUILD_DIR)/macos-arm64/libbconet.h ]; then \
		cp $(BUILD_DIR)/macos-arm64/libbconet.h $(BUILD_DIR)/macos-universal/libbconet.h; \
	fi

# Android shared .so builds: anet uses //go:linkname into net; Go 1.23+ requires -checklinkname=0 when linking.
android-arm64:
	@if [ -z "$(ANDROID_NDK_HOME)" ]; then echo "ANDROID_NDK_HOME is not set"; exit 1; fi
	@test -x "$(ANDROID_CC_ARM64)" || (echo "Missing Android clang: $(ANDROID_CC_ARM64)"; exit 1)
	@mkdir -p $(BUILD_DIR)/android-arm64
	cd $(MODULE_DIR) && \
		CGO_ENABLED=1 GOOS=android GOARCH=arm64 \
		CC="$(ANDROID_CC_ARM64)" \
		$(GO) build -buildmode=c-shared $(LDFLAGS) \
		-ldflags=-checklinkname=0 \
		-o $(BUILD_DIR)/android-arm64/libbconet.so .

android-amd64:
	@if [ -z "$(ANDROID_NDK_HOME)" ]; then echo "ANDROID_NDK_HOME is not set"; exit 1; fi
	@test -x "$(ANDROID_CC_AMD64)" || (echo "Missing Android clang: $(ANDROID_CC_AMD64)"; exit 1)
	@mkdir -p $(BUILD_DIR)/android-amd64
	cd $(MODULE_DIR) && \
		CGO_ENABLED=1 GOOS=android GOARCH=amd64 \
		CC="$(ANDROID_CC_AMD64)" \
		$(GO) build -buildmode=c-shared $(LDFLAGS) \
		-ldflags=-checklinkname=0 \
		-o $(BUILD_DIR)/android-amd64/libbconet.so .
