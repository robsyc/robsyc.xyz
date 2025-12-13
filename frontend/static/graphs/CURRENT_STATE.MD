# Current state

We have revisited the core semantics (phase 1). 

`01-basic-classes.ttl`

We have basic rendering of Classes with badge, label, etc.
- lock button but it has no real use since we need to tackle **step-wise rendering**
- a lot can be improved for the layout
    - make label click to open toolbar for: copy IRI, copy label, ...
    - the selected border (square) doesn't match the node
    - 3 bottom buttons should nicely fit in bottom part of the node, aligned with the rounded sides with, in full "Details", "Serialize", "Instances" with icon
- Hide/show children does not work, our current approach is rendering all nodes & edges at once. We want a more progressive presentation
- Nodes render stacked top to bottom, close by each other. We want to use a nicer automatic placement of nodes to make sure the hierarchy is clear and pleasant to look at => https://svelteflow.dev/examples/layout/dagre

`04-object-properties.ttl`

This test file should be split up. We should begin with just a simple set of ObjectProperties with hierarcy and domain/range(Includes), no owl inverse, property chain, etc.
Currently we show domain and range inside the node in the UI. Instead we only want to show this in the details dialog, and when clicking toggle on the sides to show domain/range(Includes) as edges that go to ObjectType classes. This also brings us back to the discussion of showing edges only when needed and making the UI more responsive. 

Tests:
 1. Object type, rdfs:Class
 2. Object type, simple sh:NodeShape (only direct and inverse property) and combination with rdfs:Class
 3. Simple object properties with hierarcy and domain/range(Includes) with present rdfs:Class
 4. More complex shacl shapes with sh:node, nested sh:property, alternative/sequence/... predicate paths
 5. Owl classes with restrictions, equivalence, disjointness
 6. Fully fledged owl:ObjectProperty with characteristics and property chain
 7. Instance data and possibly SHACL-UI hints for form presentation

We want to make the tests cumulative. We should be able to add triples to the store incrementally. For this and progressive rendering, we could look towards our FastAPI backend and Tentris SPARQL-backed triplestore. This will introduce a lot more complexity but it could help us unblock.

---

Our overarching goals for this sprint are
- improve presentation and flow layout
- more responsive piece-by-piece visualization of semantics
- lay good foundations for future, more complex model development

---


Use this document to express the current state of the implementation
- what is implemented / working
- minor improvements that could be made (e.g. visual improvements)
- issues and bugs that need to be fixed
- shortcuts that have been taken and should be revisited
- technical debt and areas for refactoring
- architectural blockers that need to be addressed (over next few sprints)
- feature extensions

This document is a living document that should also be used to guide the development and update the IMPLEMENTATION.md document.