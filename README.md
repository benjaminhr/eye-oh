# eye-oh

(Update readme, now each component can be run individually or a pi-calc process can be passed and everything is done for you)

(Update readme, mention all binaries needed in path sut_uppaal2register (and other sut binaries), tomte_learn, sut_run, pifra, deq)

(Update readme, with good lines for visualising input model and output models)

Convert an XML register automata (RA) into an [input enabled](https://en.wikipedia.org/wiki/Input/output_automaton) RA comptatible with Tomte.

### Notes about input model

- initial state must have `initial="true"`
- states with no outgoing transitions will be considered final
- relies on input transitions starting with I, output with O (as does Tomte)
- make sure not to have states prefixed `vk_N` and `kk_` or named `sink` and `sink_two` in your input model already

### Notes about output model

- the output symbols `ODummy`, `OOK`, and `OFinal` will be created
- two `sink` states will be added, which will consume the added input enabling transitions
- to make alternating input/output transitions, the model will add `OOK` transitions inbetween

### usage

- take one of the relevant binaries from the `dist` folder and place it in path or `/usr/local/bin`
- `eye-oh <input_model_name> <output_model_name>`
- `eye-oh --help` to list all available commands
