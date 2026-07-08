export class AIProvider {
  async testConnection() {
    throw new Error("testConnection must be implemented by adapter.");
  }

  async detectFindings() {
    throw new Error("detectFindings must be implemented by adapter.");
  }

  async explainFindings() {
    throw new Error(
        "explainFindings must be implemented by adapter."
    );
}
}
