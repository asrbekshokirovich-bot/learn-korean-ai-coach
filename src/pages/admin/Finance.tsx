import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Users, Calendar, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const transactionSchema = z.object({
  record_type: z.enum(["income", "expense", "potential_income", "potential_expense"]),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required"),
  record_date: z.string().min(1, "Date is required"),
  month_period: z.string().min(1, "Month period is required"),
});

const Finance = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalStudents: 0,
    activePackages: 0,
  });
  const [payments, setPayments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [financeRecords, setFinanceRecords] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      record_type: "income",
      amount: "",
      description: "",
      record_date: format(new Date(), "yyyy-MM-dd"),
      month_period: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    const currentMonth = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // Load payments
    const { data: paymentsData } = await supabase
      .from("monthly_payments")
      .select(`
        *,
        profiles!monthly_payments_student_id_fkey(full_name, email)
      `)
      .order("payment_date", { ascending: false });

    setPayments(paymentsData || []);

    // Load packages
    const { data: packagesData } = await supabase
      .from("lesson_packages")
      .select(`
        *,
        profiles!lesson_packages_student_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false });

    setPackages(packagesData || []);

    // Load finance records
    const { data: recordsData } = await supabase
      .from("finance_records")
      .select("*")
      .order("record_date", { ascending: false });

    setFinanceRecords(recordsData || []);

    // Calculate stats
    const totalRevenue = paymentsData?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
    
    const monthlyRevenue = paymentsData
      ?.filter(p => {
        const date = new Date(p.payment_date);
        return date >= currentMonth && date <= monthEnd;
      })
      .reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

    const activePackages = packagesData?.filter(p => p.status === "active").length || 0;
    
    const uniqueStudents = new Set(paymentsData?.map(p => p.student_id)).size;

    setStats({
      totalRevenue,
      monthlyRevenue,
      totalStudents: uniqueStudents,
      activePackages,
    });
  };

  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    try {
      const { error } = await supabase.from("finance_records").insert({
        record_type: values.record_type,
        amount: parseFloat(values.amount),
        description: values.description,
        record_date: values.record_date,
        month_period: values.month_period,
      });

      if (error) throw error;

      toast.success("Transaction added successfully");
      setDialogOpen(false);
      form.reset();
      loadFinanceData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Finance Dashboard</h2>
        <p className="text-muted-foreground">Track all financial transactions and revenue</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">${stats.monthlyRevenue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Paying Students</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Packages</p>
              <p className="text-2xl font-bold">{stats.activePackages}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="packages">Lesson Packages</TabsTrigger>
          <TabsTrigger value="records">Finance Records</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Payment History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{payment.profiles?.full_name || payment.profiles?.email}</TableCell>
                    <TableCell className="font-semibold">${Number(payment.amount_paid).toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(payment.month_period), "MMMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={payment.payment_status === "completed" ? "default" : "secondary"}>
                        {payment.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="packages">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Lesson Packages</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>{pkg.profiles?.full_name || pkg.profiles?.email}</TableCell>
                    <TableCell>{format(new Date(pkg.month_period), "MMM yyyy")}</TableCell>
                    <TableCell>{pkg.lessons_purchased}</TableCell>
                    <TableCell>{pkg.lessons_used}</TableCell>
                    <TableCell>{pkg.lessons_remaining}</TableCell>
                    <TableCell>${Number(pkg.total_amount_paid).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                        {pkg.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">All Finance Records</h3>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Transaction</DialogTitle>
                    <DialogDescription>
                      Record a new financial transaction
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="record_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="potential_income">Potential Income</SelectItem>
                                <SelectItem value="potential_expense">Potential Expense</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="record_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="month_period"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Month Period</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">Add Transaction</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Month</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.record_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.record_type}</Badge>
                    </TableCell>
                    <TableCell>{record.description}</TableCell>
                    <TableCell className="font-semibold">${Number(record.amount).toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(record.month_period), "MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
