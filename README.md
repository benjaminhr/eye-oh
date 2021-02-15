# eye-oh

Convert a register automata (RA) into an [input enabled](https://en.wikipedia.org/wiki/Input/output_automaton) RA

### Notes about input model

- initial state must have `initial="true"`
- final state must have `final="true"`
- relies on input transitions starting with I, output with O (as does Tomte)
- relies on the final state having a single incoming OFINAL transition (which will be moved to point to the sink state)

### Notes about output model

- the transition `ODummy` will be created
- the final state will be removed, replaced with sink states

### usage

- take one of the relevant binaries from the `dist` folder and place it in path or `/usr/local/bin`
- `eye-oh <input_model_name> <output_model_name>`
