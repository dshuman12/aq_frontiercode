package com.bco.android.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.bco.android.R

/**
 * Shown when [com.bco.android.BCOApplication] could not load `libbconet` (APK missing JNI libs).
 */
@Composable
fun NativeLibraryMissingScreen(modifier: Modifier = Modifier) {
    Column(
        modifier
            .verticalScroll(rememberScrollState())
            .padding(bottom = 8.dp),
    ) {
        Text(
            text = stringResource(R.string.native_lib_missing_title),
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(bottom = 12.dp),
        )
        Text(
            text = stringResource(R.string.native_lib_missing_body),
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
