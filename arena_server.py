#!/usr/bin/env python3
"""
Entrypoint wrapper for the Neuron Seismograph 3D Observatory Web Server (:8792).
Delegates to `neuron_seismograph.server:main`.
"""

from neuron_seismograph.server import main

if __name__ == "__main__":
    main()
