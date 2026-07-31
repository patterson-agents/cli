export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Phase-gate commits use sentence-case subjects ("P0: workspace reset").
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
