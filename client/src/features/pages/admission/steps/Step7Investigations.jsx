import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

export default function Step7Investigations({ form }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "investigations",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 7: Investigations</CardTitle>
        <CardDescription>Order initial labs, imaging, or other diagnostic tests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-4 p-4 border border-border rounded-md bg-muted/20">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`investigations.${index}.type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investigation Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CBC, Chest X-Ray..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="pt-8">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => remove(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => append({ type: "" })}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Investigation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
