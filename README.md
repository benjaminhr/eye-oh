# eye-oh

Convert an XML register automata (RA) into an [input enabled](https://en.wikipedia.org/wiki/Input/output_automaton) RA comptatible with Tomte.

### Notes about input model

- initial state must have `initial="true"`
- relies on input transitions starting with I, output with O (as does Tomte)

### Notes about output model

- the output symbols `ODummy`, `OOK`, and `OFinal` will be created
- two `sink` states will be added, which will consume the added input enabling transitions
- to make alternating input/output transitions, the model will add `OOK` transitions inbetween

### usage

- take one of the relevant binaries from the `dist` folder and place it in path or `/usr/local/bin`
- `eye-oh <input_model_name> <output_model_name>`
