#!/usr/bin/env python3
"""
Entrypoint wrapper for the Neuron Seismograph CLI (`hunt` and `battle`).
Delegates to `neuron_seismograph.cli:main`.
"""

from neuron_seismograph.cli import main

if __name__ == "__main__":
    main()
