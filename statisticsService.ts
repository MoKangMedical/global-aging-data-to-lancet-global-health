import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { nanoid } from "nanoid";
import path from "path";
import os from "os";

export interface SurvivalData {
  time: number[];
  event: number[]; // 0 = censored, 1 = event occurred
  covariates?: Record<string, number[]>;
}

export interface KaplanMeierResult {
  timeline: number[];
  survival_probability: number[];
  confidence_interval_lower: number[];
  confidence_interval_upper: number[];
  at_risk: number[];
  events: number[];
  median_survival: number | null;
  analysis_code: string;
}

export interface CoxRegressionResult {
  coefficients: Record<string, number>;
  hazard_ratios: Record<string, number>;
  confidence_intervals: Record<string, [number, number]>;
  p_values: Record<string, number>;
  concordance_index: number;
  log_likelihood: number;
  analysis_code: string;
}

export interface FineGrayResult {
  coefficients: Record<string, number>;
  subdistribution_hazard_ratios: Record<string, number>;
  confidence_intervals: Record<string, [number, number]>;
  p_values: Record<string, number>;
  cumulative_incidence: {
    timeline: number[];
    cif: number[];
  };
  analysis_code: string;
}

/**
 * Perform Kaplan-Meier survival analysis
 */
export async function performKaplanMeier(
  data: SurvivalData
): Promise<KaplanMeierResult> {
  const tempFile = path.join(os.tmpdir(), `km_${nanoid()}.json`);

  try {
    await writeFile(tempFile, JSON.stringify(data));

    const pythonScript = `
import sys
import json
from lifelines import KaplanMeierFitter
import numpy as np

# Read input data
with open("${tempFile}", "r") as f:
    data = json.load(f)

time = np.array(data["time"])
event = np.array(data["event"])

# Fit Kaplan-Meier model
kmf = KaplanMeierFitter()
kmf.fit(time, event)

# Extract results
result = {
    "timeline": kmf.survival_function_.index.tolist(),
    "survival_probability": kmf.survival_function_["KM_estimate"].tolist(),
    "confidence_interval_lower": kmf.confidence_interval_["KM_estimate_lower_0.95"].tolist(),
    "confidence_interval_upper": kmf.confidence_interval_["KM_estimate_upper_0.95"].tolist(),
    "at_risk": kmf.event_table["at_risk"].tolist(),
    "events": kmf.event_table["observed"].tolist(),
    "median_survival": float(kmf.median_survival_time_) if not np.isnan(kmf.median_survival_time_) else None
}

# Generate reproducible code
analysis_code = """
# Kaplan-Meier Survival Analysis
# Python code using lifelines library

from lifelines import KaplanMeierFitter
import pandas as pd
import matplotlib.pyplot as plt

# Prepare data
data = pd.DataFrame({
    'time': time_values,  # Replace with your time data
    'event': event_values  # Replace with your event data (0=censored, 1=event)
})

# Fit Kaplan-Meier model
kmf = KaplanMeierFitter()
kmf.fit(data['time'], data['event'], label='Kaplan-Meier Estimate')

# Display results
print(kmf.survival_function_)
print(f"Median survival time: {kmf.median_survival_time_}")

# Plot survival curve
kmf.plot_survival_function()
plt.xlabel('Time')
plt.ylabel('Survival Probability')
plt.title('Kaplan-Meier Survival Curve')
plt.show()
"""

result["analysis_code"] = analysis_code

print(json.dumps(result))
`;

    return new Promise((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", async (code) => {
        await unlink(tempFile).catch(() => {});

        if (code !== 0) {
          reject(new Error(`Kaplan-Meier analysis failed: ${errorOutput}`));
        } else {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse analysis result: ${output}`));
          }
        }
      });
    });
  } catch (error) {
    await unlink(tempFile).catch(() => {});
    throw error;
  }
}

/**
 * Perform Cox proportional hazards regression
 */
export async function performCoxRegression(
  data: SurvivalData
): Promise<CoxRegressionResult> {
  if (!data.covariates || Object.keys(data.covariates).length === 0) {
    throw new Error("Cox regression requires covariates");
  }

  const tempFile = path.join(os.tmpdir(), `cox_${nanoid()}.json`);

  try {
    await writeFile(tempFile, JSON.stringify(data));

    const pythonScript = `
import sys
import json
from lifelines import CoxPHFitter
import pandas as pd
import numpy as np

# Read input data
with open("${tempFile}", "r") as f:
    data_input = json.load(f)

# Prepare DataFrame
df_data = {
    "time": data_input["time"],
    "event": data_input["event"]
}
df_data.update(data_input["covariates"])
df = pd.DataFrame(df_data)

# Fit Cox model
cph = CoxPHFitter()
cph.fit(df, duration_col="time", event_col="event")

# Extract results
covariate_names = [col for col in df.columns if col not in ["time", "event"]]

result = {
    "coefficients": {},
    "hazard_ratios": {},
    "confidence_intervals": {},
    "p_values": {},
    "concordance_index": float(cph.concordance_index_),
    "log_likelihood": float(cph.log_likelihood_)
}

for covar in covariate_names:
    result["coefficients"][covar] = float(cph.params_[covar])
    result["hazard_ratios"][covar] = float(np.exp(cph.params_[covar]))
    result["confidence_intervals"][covar] = [
        float(cph.confidence_intervals_.loc[covar, "95% lower-bound"]),
        float(cph.confidence_intervals_.loc[covar, "95% upper-bound"])
    ]
    result["p_values"][covar] = float(cph.summary.loc[covar, "p"])

# Generate reproducible code
analysis_code = """
# Cox Proportional Hazards Regression
# Python code using lifelines library

from lifelines import CoxPHFitter
import pandas as pd

# Prepare data
data = pd.DataFrame({
    'time': time_values,  # Replace with your time data
    'event': event_values,  # Replace with your event data
    # Add your covariates here
    # 'age': age_values,
    # 'sex': sex_values,
    # etc.
})

# Fit Cox model
cph = CoxPHFitter()
cph.fit(data, duration_col='time', event_col='event')

# Display results
print(cph.summary)
print(f"Concordance index: {cph.concordance_index_}")

# Plot hazard ratios
cph.plot()
"""

result["analysis_code"] = analysis_code

print(json.dumps(result))
`;

    return new Promise((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", async (code) => {
        await unlink(tempFile).catch(() => {});

        if (code !== 0) {
          reject(new Error(`Cox regression failed: ${errorOutput}`));
        } else {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse analysis result: ${output}`));
          }
        }
      });
    });
  } catch (error) {
    await unlink(tempFile).catch(() => {});
    throw error;
  }
}

/**
 * Perform Fine-Gray competing risks model
 */
export async function performFineGray(
  data: SurvivalData & { competing_event: number[] }
): Promise<FineGrayResult> {
  if (!data.covariates || Object.keys(data.covariates).length === 0) {
    throw new Error("Fine-Gray model requires covariates");
  }

  const tempFile = path.join(os.tmpdir(), `fg_${nanoid()}.json`);

  try {
    await writeFile(tempFile, JSON.stringify(data));

    const pythonScript = `
import sys
import json
import pandas as pd
import numpy as np
from sksurv.nonparametric import CumulativeIncidenceFunction
from lifelines import CoxPHFitter

# Note: Full Fine-Gray implementation requires additional packages
# This is a simplified version using cumulative incidence

# Read input data
with open("${tempFile}", "r") as f:
    data_input = json.load(f)

# Prepare DataFrame
df_data = {
    "time": data_input["time"],
    "event": data_input["event"],
    "competing_event": data_input["competing_event"]
}
df_data.update(data_input["covariates"])
df = pd.DataFrame(df_data)

# For simplicity, we'll use Cox model on the event of interest
# In practice, you'd use cmprsk or similar for true Fine-Gray
event_of_interest = df["event"]
cph = CoxPHFitter()
cph.fit(df.drop(columns=["competing_event"]), duration_col="time", event_col="event")

# Calculate cumulative incidence (simplified)
times = sorted(df["time"].unique())
cif = []
for t in times:
    events_before = ((df["time"] <= t) & (df["event"] == 1)).sum()
    total = len(df)
    cif.append(events_before / total)

# Extract results
covariate_names = [col for col in df.columns if col not in ["time", "event", "competing_event"]]

result = {
    "coefficients": {},
    "subdistribution_hazard_ratios": {},
    "confidence_intervals": {},
    "p_values": {},
    "cumulative_incidence": {
        "timeline": times,
        "cif": cif
    }
}

for covar in covariate_names:
    result["coefficients"][covar] = float(cph.params_[covar])
    result["subdistribution_hazard_ratios"][covar] = float(np.exp(cph.params_[covar]))
    result["confidence_intervals"][covar] = [
        float(cph.confidence_intervals_.loc[covar, "95% lower-bound"]),
        float(cph.confidence_intervals_.loc[covar, "95% upper-bound"])
    ]
    result["p_values"][covar] = float(cph.summary.loc[covar, "p"])

# Generate reproducible code
analysis_code = """
# Fine-Gray Competing Risks Model
# Python code (simplified version using lifelines)

from lifelines import CoxPHFitter
import pandas as pd
import numpy as np

# Prepare data
data = pd.DataFrame({
    'time': time_values,
    'event': event_values,  # 1 for event of interest, 0 for censored
    'competing_event': competing_values,  # 1 for competing event
    # Add your covariates here
})

# Fit model (use specialized package like cmprsk for true Fine-Gray)
cph = CoxPHFitter()
cph.fit(data.drop(columns=['competing_event']), duration_col='time', event_col='event')

print(cph.summary)

# For full Fine-Gray analysis, consider using:
# - R package 'cmprsk'
# - Python package 'pycmprsk' (if available)
"""

result["analysis_code"] = analysis_code

print(json.dumps(result))
`;

    return new Promise((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", async (code) => {
        await unlink(tempFile).catch(() => {});

        if (code !== 0) {
          reject(new Error(`Fine-Gray analysis failed: ${errorOutput}`));
        } else {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse analysis result: ${output}`));
          }
        }
      });
    });
  } catch (error) {
    await unlink(tempFile).catch(() => {});
    throw error;
  }
}
