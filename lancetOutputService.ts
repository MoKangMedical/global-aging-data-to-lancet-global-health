import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { nanoid } from "nanoid";
import path from "path";
import os from "os";
import { storagePut } from "./storage";
import type { KaplanMeierResult, CoxRegressionResult } from "./statisticsService";

export interface BaselineCharacteristics {
  variables: Array<{
    name: string;
    overall: string;
    group1?: string;
    group2?: string;
    pValue?: string;
  }>;
}

export interface RegressionTable {
  variables: Array<{
    name: string;
    coefficient: number;
    hazardRatio: number;
    ci95Lower: number;
    ci95Upper: number;
    pValue: number;
  }>;
}

/**
 * Generate Lancet-style baseline characteristics table (Table 1)
 */
export async function generateBaselineTable(
  data: BaselineCharacteristics
): Promise<{ htmlContent: string; content: any }> {
  // Generate HTML table with Lancet styling
  let html = `
<div class="lancet-table">
  <table>
    <thead>
      <tr>
        <th>Characteristic</th>
        <th>Overall</th>
        ${data.variables[0]?.group1 ? '<th>Group 1</th>' : ''}
        ${data.variables[0]?.group2 ? '<th>Group 2</th>' : ''}
        ${data.variables[0]?.pValue !== undefined ? '<th>P value</th>' : ''}
      </tr>
    </thead>
    <tbody>
`;

  for (const variable of data.variables) {
    html += `
      <tr>
        <td>${variable.name}</td>
        <td>${variable.overall}</td>
        ${variable.group1 ? `<td>${variable.group1}</td>` : ''}
        ${variable.group2 ? `<td>${variable.group2}</td>` : ''}
        ${variable.pValue !== undefined ? `<td>${variable.pValue}</td>` : ''}
      </tr>
`;
  }

  html += `
    </tbody>
  </table>
</div>

<style>
.lancet-table {
  font-family: 'Times New Roman', Times, serif;
  font-size: 10pt;
  max-width: 100%;
  overflow-x: auto;
}

.lancet-table table {
  width: 100%;
  border-collapse: collapse;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
}

.lancet-table thead {
  border-bottom: 1px solid #000;
}

.lancet-table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: bold;
}

.lancet-table td {
  padding: 6px 12px;
  border: none;
}

.lancet-table tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}
</style>
`;

  return {
    htmlContent: html,
    content: data,
  };
}

/**
 * Generate Lancet-style regression results table
 */
export async function generateRegressionTable(
  data: RegressionTable
): Promise<{ htmlContent: string; content: any }> {
  let html = `
<div class="lancet-table">
  <table>
    <thead>
      <tr>
        <th>Variable</th>
        <th>Coefficient</th>
        <th>Hazard Ratio</th>
        <th>95% CI</th>
        <th>P value</th>
      </tr>
    </thead>
    <tbody>
`;

  for (const variable of data.variables) {
    const ci = `${variable.ci95Lower.toFixed(2)}–${variable.ci95Upper.toFixed(2)}`;
    const pValue = variable.pValue < 0.001 ? '<0.001' : variable.pValue.toFixed(3);

    html += `
      <tr>
        <td>${variable.name}</td>
        <td>${variable.coefficient.toFixed(3)}</td>
        <td>${variable.hazardRatio.toFixed(2)}</td>
        <td>${ci}</td>
        <td>${pValue}</td>
      </tr>
`;
  }

  html += `
    </tbody>
  </table>
</div>

<style>
.lancet-table {
  font-family: 'Times New Roman', Times, serif;
  font-size: 10pt;
  max-width: 100%;
  overflow-x: auto;
}

.lancet-table table {
  width: 100%;
  border-collapse: collapse;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
}

.lancet-table thead {
  border-bottom: 1px solid #000;
}

.lancet-table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: bold;
}

.lancet-table td {
  padding: 6px 12px;
  border: none;
}

.lancet-table tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}
</style>
`;

  return {
    htmlContent: html,
    content: data,
  };
}

/**
 * Generate Lancet-style Kaplan-Meier survival curve
 */
export async function generateSurvivalCurve(
  kmResult: KaplanMeierResult,
  title: string,
  userId: number
): Promise<{ fileKey: string; fileUrl: string }> {
  const tempDataFile = path.join(os.tmpdir(), `km_data_${nanoid()}.json`);
  const tempImageFile = path.join(os.tmpdir(), `km_plot_${nanoid()}.png`);

  try {
    await writeFile(tempDataFile, JSON.stringify(kmResult));

    const pythonScript = `
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Read data
with open("${tempDataFile}", "r") as f:
    data = json.load(f)

# Create figure with Lancet style
plt.figure(figsize=(8, 6), dpi=300)
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.serif'] = ['Times New Roman']
plt.rcParams['font.size'] = 10

# Plot survival curve
timeline = np.array(data["timeline"])
survival = np.array(data["survival_probability"])
ci_lower = np.array(data["confidence_interval_lower"])
ci_upper = np.array(data["confidence_interval_upper"])

plt.step(timeline, survival, where='post', color='#000080', linewidth=2, label='Survival probability')
plt.fill_between(timeline, ci_lower, ci_upper, step='post', alpha=0.2, color='#000080', label='95% CI')

# Styling
plt.xlabel('Time', fontsize=11, fontweight='bold')
plt.ylabel('Survival probability', fontsize=11, fontweight='bold')
plt.title("${title}", fontsize=12, fontweight='bold')
plt.xlim(left=0)
plt.ylim(0, 1.05)
plt.grid(True, alpha=0.3, linestyle='--')
plt.legend(loc='best', frameon=False)

# Add at-risk table below the plot
ax = plt.gca()
at_risk = data["at_risk"]
time_points = [0] + [t for i, t in enumerate(timeline) if i % max(1, len(timeline)//5) == 0][:5]
at_risk_values = [at_risk[0]] + [at_risk[timeline.index(t)] if t in timeline else 0 for t in time_points[1:]]

table_data = [['Number at risk'] + [str(v) for v in at_risk_values]]
table = plt.table(cellText=table_data,
                  colLabels=[''] + [f'{int(t)}' for t in time_points],
                  cellLoc='center',
                  loc='bottom',
                  bbox=[0, -0.25, 1, 0.15])
table.auto_set_font_size(False)
table.set_fontsize(9)

plt.tight_layout()
plt.savefig("${tempImageFile}", dpi=300, bbox_inches='tight', facecolor='white')
plt.close()

print("SUCCESS")
`;

    await new Promise<void>((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0 || !output.includes("SUCCESS")) {
          reject(new Error(`Failed to generate survival curve: ${errorOutput}`));
        } else {
          resolve();
        }
      });
    });

    // Read generated image and upload to S3
    const imageBuffer = await readFile(tempImageFile);
    const fileKey = `user-${userId}/figures/survival_curve_${nanoid()}.png`;
    const { url } = await storagePut(fileKey, imageBuffer, "image/png");

    return { fileKey, fileUrl: url };
  } finally {
    await unlink(tempDataFile).catch(() => {});
    await unlink(tempImageFile).catch(() => {});
  }
}

/**
 * Generate Lancet-style forest plot for Cox regression
 */
export async function generateForestPlot(
  coxResult: CoxRegressionResult,
  title: string,
  userId: number
): Promise<{ fileKey: string; fileUrl: string }> {
  const tempDataFile = path.join(os.tmpdir(), `forest_data_${nanoid()}.json`);
  const tempImageFile = path.join(os.tmpdir(), `forest_plot_${nanoid()}.png`);

  try {
    await writeFile(tempDataFile, JSON.stringify(coxResult));

    const pythonScript = `
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Read data
with open("${tempDataFile}", "r") as f:
    data = json.load(f)

# Prepare data for forest plot
variables = list(data["hazard_ratios"].keys())
hrs = [data["hazard_ratios"][v] for v in variables]
ci_lower = [data["confidence_intervals"][v][0] for v in variables]
ci_upper = [data["confidence_intervals"][v][1] for v in variables]
p_values = [data["p_values"][v] for v in variables]

# Create figure
fig, ax = plt.subplots(figsize=(10, max(6, len(variables) * 0.5)), dpi=300)
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.serif'] = ['Times New Roman']
plt.rcParams['font.size'] = 10

# Plot forest plot
y_positions = np.arange(len(variables))

for i, (var, hr, ci_l, ci_u, p) in enumerate(zip(variables, hrs, ci_lower, ci_upper, p_values)):
    # Plot CI line
    ax.plot([ci_l, ci_u], [i, i], 'k-', linewidth=1.5)
    
    # Plot HR point
    color = '#000080' if p < 0.05 else '#808080'
    ax.plot(hr, i, 'o', markersize=8, color=color, markeredgecolor='black', markeredgewidth=0.5)

# Add reference line at HR=1
ax.axvline(x=1, color='red', linestyle='--', linewidth=1, alpha=0.7)

# Styling
ax.set_yticks(y_positions)
ax.set_yticklabels(variables)
ax.set_xlabel('Hazard Ratio (95% CI)', fontsize=11, fontweight='bold')
ax.set_title("${title}", fontsize=12, fontweight='bold')
ax.grid(axis='x', alpha=0.3, linestyle='--')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

# Add HR and CI text
for i, (var, hr, ci_l, ci_u, p) in enumerate(zip(variables, hrs, ci_lower, ci_upper, p_values)):
    text = f'{hr:.2f} ({ci_l:.2f}–{ci_u:.2f})'
    p_text = f'p<0.001' if p < 0.001 else f'p={p:.3f}'
    ax.text(ax.get_xlim()[1] * 1.05, i, f'{text}, {p_text}', 
            va='center', fontsize=9)

plt.tight_layout()
plt.savefig("${tempImageFile}", dpi=300, bbox_inches='tight', facecolor='white')
plt.close()

print("SUCCESS")
`;

    await new Promise<void>((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0 || !output.includes("SUCCESS")) {
          reject(new Error(`Failed to generate forest plot: ${errorOutput}`));
        } else {
          resolve();
        }
      });
    });

    // Read generated image and upload to S3
    const imageBuffer = await readFile(tempImageFile);
    const fileKey = `user-${userId}/figures/forest_plot_${nanoid()}.png`;
    const { url } = await storagePut(fileKey, imageBuffer, "image/png");

    return { fileKey, fileUrl: url };
  } finally {
    await unlink(tempDataFile).catch(() => {});
    await unlink(tempImageFile).catch(() => {});
  }
}

/**
 * Generate cumulative incidence curve for competing risks
 */
export async function generateCumulativeIncidenceCurve(
  cifData: { timeline: number[]; cif: number[] },
  title: string,
  userId: number
): Promise<{ fileKey: string; fileUrl: string }> {
  const tempDataFile = path.join(os.tmpdir(), `cif_data_${nanoid()}.json`);
  const tempImageFile = path.join(os.tmpdir(), `cif_plot_${nanoid()}.png`);

  try {
    await writeFile(tempDataFile, JSON.stringify(cifData));

    const pythonScript = `
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Read data
with open("${tempDataFile}", "r") as f:
    data = json.load(f)

# Create figure
plt.figure(figsize=(8, 6), dpi=300)
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.serif'] = ['Times New Roman']
plt.rcParams['font.size'] = 10

# Plot cumulative incidence
timeline = np.array(data["timeline"])
cif = np.array(data["cif"])

plt.step(timeline, cif, where='post', color='#000080', linewidth=2)

# Styling
plt.xlabel('Time', fontsize=11, fontweight='bold')
plt.ylabel('Cumulative Incidence', fontsize=11, fontweight='bold')
plt.title("${title}", fontsize=12, fontweight='bold')
plt.xlim(left=0)
plt.ylim(0, max(cif) * 1.1)
plt.grid(True, alpha=0.3, linestyle='--')

plt.tight_layout()
plt.savefig("${tempImageFile}", dpi=300, bbox_inches='tight', facecolor='white')
plt.close()

print("SUCCESS")
`;

    await new Promise<void>((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0 || !output.includes("SUCCESS")) {
          reject(new Error(`Failed to generate CIF curve: ${errorOutput}`));
        } else {
          resolve();
        }
      });
    });

    // Read generated image and upload to S3
    const imageBuffer = await readFile(tempImageFile);
    const fileKey = `user-${userId}/figures/cif_curve_${nanoid()}.png`;
    const { url } = await storagePut(fileKey, imageBuffer, "image/png");

    return { fileKey, fileUrl: url };
  } finally {
    await unlink(tempDataFile).catch(() => {});
    await unlink(tempImageFile).catch(() => {});
  }
}
