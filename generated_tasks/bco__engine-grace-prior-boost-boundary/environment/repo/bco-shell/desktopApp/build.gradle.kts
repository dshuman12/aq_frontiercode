import org.jetbrains.compose.desktop.application.dsl.TargetFormat
import org.gradle.language.jvm.tasks.ProcessResources

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.kotlin.compose)
}

val isMacOs = System.getProperty("os.name").contains("Mac", ignoreCase = true)
val helperPackageDir = layout.projectDirectory.dir("macosHelper")
val generatedNativeResourcesDir = layout.buildDirectory.dir("generated/resources/desktopMain")
val repoRootDir = projectDir.parentFile.parentFile
val libbconetSource = repoRootDir.resolve("bco-macos/lib/libbconet.dylib")
val helperBinarySource = providers.provider {
    val defaultHelper = helperPackageDir.file(".build/release/BCODesktopHelper").asFile
    if (defaultHelper.isFile) {
        defaultHelper
    } else {
        helperPackageDir.asFileTree.matching {
            include(".build/*/release/BCODesktopHelper")
        }.files
            .sortedBy { it.absolutePath }
            .firstOrNull()
            ?: defaultHelper
    }
}

kotlin {
    jvm("desktop")

    sourceSets {
        val desktopMain by getting {
            resources.srcDir(generatedNativeResourcesDir)
            dependencies {
                implementation(project(":composeApp"))
                implementation(compose.desktop.currentOs)
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.ui)
                implementation(libs.compose.material3.windowsizeclass)
            }
        }
    }
}

val buildMacOsHelper by tasks.registering(Exec::class) {
    description = "Build the macOS helper executable"
    group = "build"
    onlyIf { isMacOs }
    workingDir(helperPackageDir.asFile)
    commandLine("swift", "build", "-c", "release")
}

val syncMacOsNativeArtifacts by tasks.registering(Copy::class) {
    description = "Bundle helper and libbconet into desktop resources"
    group = "build"
    onlyIf { isMacOs }
    dependsOn(buildMacOsHelper)
    from(libbconetSource) {
        into("native/macos")
    }
    from(helperBinarySource) {
        into("native/macos")
    }
    into(generatedNativeResourcesDir)
}

tasks.withType<ProcessResources>().configureEach {
    if (isMacOs) {
        dependsOn(syncMacOsNativeArtifacts)
    }
}

compose.desktop {
    application {
        mainClass = "com.bco.desktop.MainKt"

        nativeDistributions {
            targetFormats(TargetFormat.Dmg)
            packageName = "BCO"
            packageVersion = "1.0.0"

            macOS {
                infoPlist {
                    extraKeysRawXml = """
                        <key>NSBluetoothAlwaysUsageDescription</key>
                        <string>BCO needs Bluetooth access to detect and manage your paired audio devices.</string>
                    """
                }
            }
        }
    }
}
