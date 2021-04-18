# eye-oh

A set of tools for converting π-calculus processes into Register Automata in XML. Each component can be run in isolation or the whole pipeline can be run at once. Additionally, there exists a tool for converting Register Automata from [Tomte's XML format](https://tomte.cs.ru.nl/Tomte-0-41/Description) to [DEQ's XML format](https://github.com/stersay/deq). [Pifra](https://github.com/sengleung/pifra) is used to convert π-calculus processes to a labelled transition representing FRAs.

Below we can see a high level overview of all the components and their relevant data formats.

![diagram](diagram.png)

### Notes about π-calculus definition files
- file extension must be `.pi`
- syntax must conform to [Pifra's syntax](https://github.com/sengleung/pifra)

### Notes about input model

- initial state must have `initial="true"`
- states with no outgoing transitions will be considered final
- relies on input transitions starting with I, output with O (as does Tomte)
- make sure not to have states prefixed `vk_N` and `kk_` or named `sink` and `sink_two` in your input model already

### Notes about output model

- the output symbols `ODummy`, `OOK`, and `OFinal` will be created
- two `sink` states will be added, which will consume the added input enabling transitions
- to make alternating input/output transitions, the model will add `OOK` transitions inbetween

### Usage

- take one of the relevant binaries from the `dist` folder and place it in path or `/usr/local/bin`
- `eye-oh --help` to list all available commands
