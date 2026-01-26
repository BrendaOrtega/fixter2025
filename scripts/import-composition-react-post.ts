import { db } from "../app/.server/db";

const postContent = `
Welcome, we will explore composition in React, a powerful technique that allows us to create modular and highly reusable components. As software developers, we constantly seek ways to improve the efficiency and quality of our code, and composition in React is an invaluable tool for achieving that. Throughout this post, we will learn about the fundamental concepts of composition in React and how to effectively apply it in our projects.

## What is Composition in React?

Composition in React is a technique based on the idea of breaking down our code into small, independent components and combining them to form more complex components. Instead of having a large component that contains all the logic and presentation, we can create smaller, reusable components that handle specific tasks. This modularity provides us with flexibility, readability, and facilitates code maintenance.

## Functional Components and Composition

In React, functional components serve as the foundation for composition. These components are JavaScript functions that receive properties (props) as arguments and return React elements representing the user interface. We can combine multiple functional components to create larger and more sophisticated components. Let's see an example:

\`\`\`javascript
const Title = () => <h1>Welcome!</h1>;

const Content = () => (
  <p>
    In this blog, we will explore composition in React and how it can benefit
    our projects.
  </p>
);

const BlogPost = () => (
  <div>
    <Title />
    <Content />
  </div>
);
\`\`\`

In this case, we have created three functional components: Title, Content, and BlogPost. BlogPost combines the other two components to form a hierarchical structure, where Title and Content are child components of BlogPost. This composition allows us to separate responsibilities and reuse smaller components in different contexts.

## Component Composition through Props

Composition in React can also be achieved by using props. We can pass components as properties to other components and use them as if they were HTML elements. This allows us to customize and adapt the functionality of a component to different situations. Let's see an example:

\`\`\`javascript
const Button = ({ children, icon }) => (
  <button>
    {icon && icon} {children}
  </button>
);

const PrimaryButton = () => (
  <Button>
    <strong>Click here!</strong>
  </Button>
);

const SecondaryButton = () => (
  <Button>
    <em>Press to continue</em>
  </Button>
);

const IconButton = () => <Button icon={<Icon />}>Like</Button>;
\`\`\`

In this case, we have created the Button component that accepts a prop called children and uses it to render the content inside the button. Then, we have created two components, PrimaryButton and SecondaryButton, which utilize the Button component and pass different content as properties. This way, we can create button variations without duplicating code.

## Advanced Composition Patterns

In addition to basic composition, React provides us with other tools and patterns to further enhance modularity and reusability of our components. Some of these patterns include the use of Higher-Order Components (HOCs), render props, and the new hooks-based approach using useContext and useReducer. Exploring these patterns can be a crucial step to take our composition in React to the next level.

## Conclusion

Composition in React is a powerful technique that allows us to build more efficient and maintainable applications. By breaking down our components into smaller and reusable parts, we improve code readability and scalability. Through code examples, we have explored how to use functional components, props, and advanced composition patterns in React. I hope this article has provided you with a solid foundation to apply composition in your projects and enhance your React development.

Remember, composition in React is not just about writing code but also adopting a modular and reusable mindset. Keep exploring and experimenting with this technique, and you will witness significant improvements in your workflow and code quality.
`;

async function main() {
  console.log("Importando post: Composition in React...");

  const existing = await db.post.findUnique({
    where: {
      slug: "exploring-composition-in-react-empowering-modularity-and-component-reusability-2023",
    },
  });

  if (existing) {
    console.log("⚠️  El post ya existe, saltando...");
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "exploring-composition-in-react-empowering-modularity-and-component-reusability-2023",
      title:
        "Exploring Composition in React: Empowering Modularity and Component Reusability",
      body: postContent.trim(),
      published: true,

      // Autor original
      authorName: "Mariana López",
      authorAt: "@marianaLz",
      photoUrl: "https://avatars.githubusercontent.com/u/46253287?v=4",
      authorAtLink: "https://github.com/marianaLz",

      // Imágenes
      coverImage: "https://i.imgur.com/8UgSWuh.png",
      metaImage: "https://i.imgur.com/8UgSWuh.png",

      // Clasificación
      tags: ["react", "inglés", "composition", "womenintech"],
      mainTag: "web",
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
