import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { createUsersWorkflow } from "@medusajs/core-flows";

export default async function createAdmin({ container }: ExecArgs) {
  console.log("Creating admin user...");

  await createUsersWorkflow(container).run({
    input: {
      users: [
        {
          email: "admin@quotewear.com",
        }
      ]
    }
  });

  console.log("User created! Default password should be empty or you need to set it via auth provider.");
}
