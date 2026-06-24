package com.bco.shared.ui.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.bco.shared.platform.LocalPlatformContext
import com.bco.shared.platform.isDesktopHost
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.ui.adaptive.isCompact
import com.bco.shared.ui.adaptive.isExpanded
import com.bco.shared.ui.adaptive.isMedium
import com.bco.shared.designsystem.theme.BCOColorPalette
import com.bco.shared.designsystem.theme.BCOTheme
import org.jetbrains.compose.resources.stringResource

/**
 * Platform-aware onboarding shell: Android includes permissions, desktop starts at headset select.
 * This file owns navigation and responsive layout.
 */
@Composable
fun OnboardingFlow(
    windowWidthSizeClass: WindowWidthSizeClass,
    /** Bumps on activity ON_RESUME so permission and device lists refresh after system changes. */
    refreshKey: Any? = null,
    isBatteryOptimizationIgnored: Boolean,
    onRequestBatteryOptimization: () -> Unit,
    onFinished: () -> Unit,
) {
    val platformContext = LocalPlatformContext.current
    val isDesktopHost = platformContext.isDesktopHost()
    val steps = remember(isDesktopHost) {
        if (isDesktopHost) desktopOnboardingSteps else OnboardingStep.entries.toList()
    }
    var currentStep by remember(steps) { mutableStateOf(steps.first()) }
    val currentStepNumber = steps.indexOf(currentStep).let { index ->
        if (index >= 0) index + 1 else 1
    }

    val widthClass = windowWidthSizeClass
    val horizontalPadding = when {
        widthClass.isCompact() -> 16.dp
        widthClass.isMedium() -> 24.dp
        else -> 32.dp
    }
    val contentMaxWidth: Dp? = if (widthClass.isExpanded()) 840.dp else null

    BCOTheme(palette = BCOColorPalette.Dark) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .systemBarsPadding()
                    .padding(horizontal = horizontalPadding),
                contentAlignment = Alignment.TopCenter,
            ) {
                val innerModifier = if (contentMaxWidth != null) {
                    Modifier
                        .widthIn(max = contentMaxWidth)
                        .fillMaxWidth()
                        .fillMaxSize()
                } else {
                    Modifier.fillMaxSize()
                }
                Column(
                    modifier = innerModifier.padding(vertical = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    horizontalAlignment = Alignment.Start,
                ) {
                    Text(
                        text = stringResource(
                            Res.string.onboarding_setup_step,
                            currentStepNumber,
                            steps.size,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFeatureSettings = "smcp",
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Start,
                    )
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        when (currentStep) {
                            OnboardingStep.Permissions -> OnboardingPermissionsScreen(
                                refreshKey = refreshKey,
                                onContinue = { currentStep = OnboardingStep.DeviceSelect },
                            )
                            OnboardingStep.DeviceSelect -> OnboardingDeviceSelectScreen(
                                refreshKey = refreshKey,
                                onContinue = { currentStep = OnboardingStep.StartService },
                            )
                            OnboardingStep.StartService -> StartServiceScreen(
                                refreshKey = refreshKey,
                                isBatteryOptimizationIgnored = isBatteryOptimizationIgnored,
                                onRequestBatteryOptimization = onRequestBatteryOptimization,
                                onContinue = { currentStep = OnboardingStep.PairDevice },
                            )
                            OnboardingStep.PairDevice -> OnboardingPairDeviceScreen(
                                onContinue = onFinished,
                            )
                        }
                    }
                }
            }
        }
    }
}

private enum class OnboardingStep {
    Permissions,
    DeviceSelect,
    StartService,
    PairDevice,
}

private val desktopOnboardingSteps = listOf(
    OnboardingStep.DeviceSelect,
    OnboardingStep.StartService,
    OnboardingStep.PairDevice,
)
