import java.io.File
import java.util.Properties
import org.gradle.api.tasks.testing.Test
import org.gradle.testing.jacoco.plugins.JacocoTaskExtension
import org.gradle.testing.jacoco.tasks.JacocoCoverageVerification
import org.gradle.testing.jacoco.tasks.JacocoReport

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kotlin.compose)
    jacoco
}

jacoco {
    toolVersion = libs.versions.jacoco.get()
}

/** Sibling `bco-core` (shell module lives in `bco-shell/` next to `bco-core/`). */
private val bcoCoreDir: File = rootProject.projectDir.parentFile.resolve("bco-core")

private fun resolveAndroidNdkHome(): String? {
    System.getenv("ANDROID_NDK_HOME")?.trim()?.takeIf { File(it).isDirectory }?.let { return it }
    val lp = rootProject.file("local.properties")
    if (!lp.isFile) return null
    val props = Properties()
    lp.inputStream().use { props.load(it) }
    props.getProperty("ndk.dir")?.trim()?.removeSuffix("/")?.takeIf { File(it).isDirectory }?.let { return it }
    val sdkDir = props.getProperty("sdk.dir")?.trim()?.removeSuffix("/") ?: return null
    val ndkRoot = File(sdkDir, "ndk")
    if (!ndkRoot.isDirectory) return null
    val dirs = ndkRoot.listFiles()?.filter { it.isDirectory } ?: return null
    if (dirs.isEmpty()) return null
    return dirs.maxBy { it.name }.absolutePath
}

/** Same patterns as `jacocoTestReport` / `jacocoTestCoverageVerification` (generated + synthetic). */
private val jacocoCoverageExcludes = listOf(
    "**/R.class",
    "**/R\$*.class",
    "**/BuildConfig.*",
    "**/Manifest*.*",
    "**/*Test*.*",
    "**/*\$Lambda$*.*",
    "**/*\$inlined$*.*",
)

android {
    namespace = "com.bco.android"
    compileSdk = 35
    ndkVersion = "30.0.14904198"

    defaultConfig {
        applicationId = "com.bco.android"
        minSdk = 31
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        debug {
            enableUnitTestCoverage = true
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
}

tasks.register<Exec>("buildBcoCoreAndroidArm64") {
    group = "build"
    description = "Run `make android-arm64` in ../bco-core (requires ANDROID_NDK_HOME or sdk/ndk)"

    doFirst {
        val ndk = resolveAndroidNdkHome()
            ?: throw org.gradle.api.GradleException(
                "Android NDK not found. Set ANDROID_NDK_HOME or install NDK via SDK Manager " +
                    "(see local.properties sdk.dir + ndk/).",
            )
        environment("ANDROID_NDK_HOME", ndk)
    }
    workingDir = bcoCoreDir
    commandLine("make", "android-arm64")
}

tasks.register<Copy>("syncBconetJniLib") {
    group = "build"
    description = "Build bco-core for arm64 and copy libbconet.so to src/main/jniLibs/arm64-v8a/"
    dependsOn("buildBcoCoreAndroidArm64")
    from(File(bcoCoreDir, "build/android-arm64/libbconet.so"))
    into(file("src/main/jniLibs/arm64-v8a"))
}

if (project.findProperty("bco.syncNative") == "true") {
    tasks.named("preBuild").configure { dependsOn("syncBconetJniLib") }
}

dependencies {
    implementation(project(":composeApp"))

    implementation(platform(libs.compose.bom))
    androidTestImplementation(platform(libs.compose.bom))
    testImplementation(platform(libs.compose.bom))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.material3:material3-window-size-class")
    implementation(libs.navigation.compose)

    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.ktx)
    implementation(libs.lifecycle.runtime.compose)

    implementation("${libs.jna.get()}@aar")
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.zxing.core)

    testImplementation(libs.test.ext.junit)
    testImplementation(libs.test.core.ktx)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.robolectric)

    androidTestImplementation(libs.test.ext.junit)
    androidTestImplementation(libs.test.runner)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

tasks.withType<Test>().configureEach {
    extensions.configure(JacocoTaskExtension::class.java) {
        isIncludeNoLocationClasses = true
        excludes = listOf("jdk.internal.*")
    }
}

tasks.register<JacocoReport>("jacocoTestReport") {
    group = "verification"
    description = "JaCoCo HTML/XML for debug unit tests"

    dependsOn("testDebugUnitTest")

    val javaClasses = layout.buildDirectory.dir("intermediates/javac/debug/compileDebugJavaWithJavac/classes").get().asFile
    val kotlinClasses = layout.buildDirectory.dir("tmp/kotlin-classes/debug").get().asFile

    classDirectories.setFrom(
        files(
            fileTree(javaClasses) { exclude(jacocoCoverageExcludes) },
            fileTree(kotlinClasses) { exclude(jacocoCoverageExcludes) },
        ),
    )
    sourceDirectories.setFrom(files("$projectDir/src/main/java"))
    executionData.setFrom(
        layout.buildDirectory.file("outputs/unit_test_code_coverage/debugUnitTest/testDebugUnitTest.exec"),
    )

    reports {
        html.required.set(true)
        html.outputLocation.set(layout.buildDirectory.dir("reports/jacoco/html"))
        xml.required.set(true)
        xml.outputLocation.set(layout.buildDirectory.file("reports/jacoco/jacoco.xml"))
    }
}

tasks.register<JacocoCoverageVerification>("jacocoTestCoverageVerification") {
    group = "verification"
    description =
        "Fails if debug unit test LINE coverage for com.bco.android is below 90% (not wired to check/build)"

    dependsOn("testDebugUnitTest")

    val javaClasses = layout.buildDirectory.dir("intermediates/javac/debug/compileDebugJavaWithJavac/classes").get().asFile
    val kotlinClasses = layout.buildDirectory.dir("tmp/kotlin-classes/debug").get().asFile

    classDirectories.setFrom(
        files(
            fileTree(javaClasses) {
                include("com/bco/android/**")
                exclude(jacocoCoverageExcludes)
            },
            fileTree(kotlinClasses) {
                include("com/bco/android/**")
                exclude(jacocoCoverageExcludes)
            },
        ),
    )
    sourceDirectories.setFrom(files("$projectDir/src/main/java"))
    executionData.setFrom(
        layout.buildDirectory.file("outputs/unit_test_code_coverage/debugUnitTest/testDebugUnitTest.exec"),
    )

    violationRules {
        rule {
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.90".toBigDecimal()
            }
        }
    }
}
