CXX ?= c++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -Werror -pedantic

BUILD_DIR := build
BINARY := $(BUILD_DIR)/jsonschema-demo
SOURCES := \
	src/main.cpp \
	src/command_bundle.cc \
	src/command_lint.cc \
	src/command_validate.cc
HEADERS := \
	src/commands.h \
	src/logger.h \
	src/resolver.h

.PHONY: all configure compile test clang_format_test clean

all: configure compile test

configure:
	mkdir -p $(BUILD_DIR)

compile: $(BINARY)

$(BINARY): $(SOURCES) $(HEADERS) | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -I. $(SOURCES) -o $(BINARY)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

test: compile
	for script in test/*.sh; do "$$script" $(BINARY); done

clang_format_test:
	clang-format --dry-run --Werror $(SOURCES) $(HEADERS)

clean:
	rm -rf $(BUILD_DIR)
