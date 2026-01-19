name: Feature Request
description: Request a new feature
title: "[FEATURE] "
labels: ["enhancement", "needs-triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature! Help us improve Verifactu.

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Clear description of the feature
      placeholder: What feature would you like to see?
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: Problem It Solves
      description: What problem does this solve?
      placeholder: The problem is...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: How should it work?
      placeholder: Here is how it could work...
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternative Solutions
      description: Any other approaches?
      placeholder: We could also...

  - type: textarea
    id: mockups
    attributes:
      label: Mockups or Examples
      description: Wireframes, mockups, or examples
      placeholder: Attach images or links

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other relevant information
      placeholder: Additional details...

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have searched for existing feature requests
          required: true
        - label: This feature is relevant to the project scope
          required: true
        - label: I have provided a clear use case
          required: true
